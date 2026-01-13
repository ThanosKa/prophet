import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages, chats } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { anthropic } from '@/lib/anthropic'
import { AGENT_TOOLS } from '@/lib/agent/tools'
import { AGENT_SYSTEM_PROMPT, AGENT_MAX_TOKENS } from '@/lib/agent/system-prompt'
import { agentChatRequestSchema, DEFAULT_AGENT_MODEL, sanitizeForLog } from '@prophet/shared'
import { error } from '@/types'
import { logger } from '@/lib/logger'
import { calculateCostInCents, type ModelName } from '@/lib/pricing'
import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { devLogger } from '@/lib/dev-logger'

export async function POST(req: Request) {
  logger.debug({}, '[DEV] Agent chat endpoint called')

  if (process.env.NODE_ENV !== 'development') {
    logger.warn({}, '[DEV] Endpoint called in non-development environment')
    return NextResponse.json(
      error('This endpoint is only available in development', 'FORBIDDEN'),
      { status: 403 }
    )
  }

  try {
    const body = await req.json()
    logger.debug({ body: sanitizeForLog(body) }, '[DEV] Request body received')

    const validation = agentChatRequestSchema.safeParse(body)

    if (!validation.success) {
      logger.warn(
        { errors: validation.error.issues },
        '[DEV] Request validation failed'
      )
      return NextResponse.json(
        error('Invalid request body', 'VALIDATION_ERROR', validation.error.issues),
        { status: 400 }
      )
    }

    logger.debug({}, '[DEV] Request validation passed')

    const { chatId, userMessage, toolResults, previousContent, enableThinking } = validation.data
    const model = (validation.data.model ?? DEFAULT_AGENT_MODEL) as ModelName

    // Build Anthropic messages based on request type
    // IMPORTANT: For continuation turns (toolResults), we DON'T load from DB.
    // The client manages conversation state during the agentic loop.
    let anthropicMessages: MessageParam[]
    const isFirstTurn = !!userMessage
    const isContinuationTurn = !!(toolResults && previousContent)

    if (isFirstTurn) {
      // First turn: Load existing conversation from DB + append new user message
      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      })

      anthropicMessages = chatMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }))

      logger.debug({ messageLength: userMessage.length }, '[DEV] Building initial message')
      anthropicMessages.push({
        role: 'user',
        content: userMessage,
      })
    } else if (isContinuationTurn) {
      // Continuation turn: DON'T load from DB - use client-provided state only
      const chatMessages = await db.query.messages.findMany({
        where: eq(messages.chatId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      })

      // Only include messages up to the last USER message
      const baseMessages: MessageParam[] = []
      for (const msg of chatMessages) {
        baseMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })
      }
      // Remove the last assistant message if it exists (it's duplicated in previousContent)
      if (baseMessages.length > 0 && baseMessages[baseMessages.length - 1].role === 'assistant') {
        baseMessages.pop()
      }

      anthropicMessages = baseMessages

      logger.debug({ toolResultCount: toolResults.length }, '[DEV] Building continuation message')
      anthropicMessages.push({
        role: 'assistant',
        content: previousContent as ContentBlockParam[],
      })
      anthropicMessages.push({
        role: 'user',
        content: toolResults.map((tr) => ({
          type: 'tool_result' as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
          is_error: tr.is_error,
        })),
      })
    } else {
      logger.warn({}, '[DEV] Neither userMessage nor toolResults provided')
      return NextResponse.json(
        error('Either userMessage or toolResults is required', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    logger.debug(
      { model, messageCount: anthropicMessages.length, hasToolResults: !!toolResults },
      '[DEV] Starting agent stream'
    )

    // DEV LOGGING: Log request to LLM
    await devLogger.logRequest(model, anthropicMessages, AGENT_SYSTEM_PROMPT, { enableThinking })

    const encoder = new TextEncoder()
    let controllerClosed = false
    const stream = new ReadableStream({
      async start(controller) {
        const safeEnqueue = (data: string) => {
          if (!controllerClosed) {
            try {
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } catch {
              controllerClosed = true
            }
          }
        }

        const safeClose = () => {
          if (!controllerClosed) {
            try {
              controller.close()
            } catch {
              // Ignore
            }
            controllerClosed = true
          }
        }

        let fullTextResponse = ''
        let inputTokens = 0
        let outputTokens = 0
        let contentDeltaCount = 0
        let toolUseCount = 0
        const contentBlocks: ContentBlockParam[] = []

        try {
          logger.debug({ model, maxTokens: enableThinking ? 16000 : AGENT_MAX_TOKENS, enableThinking }, '[DEV] Creating Anthropic stream')

          const anthropicStream = await anthropic.messages.stream({
            model,
            max_tokens: enableThinking ? 16000 : AGENT_MAX_TOKENS,
            system: [
              {
                type: 'text',
                text: AGENT_SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' },
              },
            ],
            tools: AGENT_TOOLS,
            messages: anthropicMessages,
            ...(enableThinking && {
              thinking: {
                type: 'enabled',
                budget_tokens: 8000,
              },
            }),
          })

          logger.debug({}, '[DEV] Anthropic stream created, processing events')

          let currentToolUse: { id: string; name: string; input: string } | null = null

          // Send session_created at the start
          safeEnqueue(JSON.stringify({
            type: 'session_created',
            sessionId: chatId,
          }))

          for await (const event of anthropicStream) {
            if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens
              logger.debug({ inputTokens }, '[DEV] Message started')
            } else if (event.type === 'content_block_start') {
              if (event.content_block.type === 'tool_use') {
                toolUseCount++
                currentToolUse = {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  input: '',
                }
                logger.debug(
                  { toolUseId: event.content_block.id, toolName: event.content_block.name },
                  '[DEV] Tool use started'
                )
              }
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                contentDeltaCount++
                const text = event.delta.text
                fullTextResponse += text
                safeEnqueue(JSON.stringify({
                  type: 'content_delta',
                  delta: text,
                }))
              } else if (event.delta.type === 'thinking_delta') {
                safeEnqueue(JSON.stringify({
                  type: 'thinking_delta',
                  delta: event.delta.thinking,
                }))
              } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
                currentToolUse.input += event.delta.partial_json
              }
            } else if (event.type === 'content_block_stop') {
              if (currentToolUse) {
                let parsedInput = {}
                try {
                  parsedInput = currentToolUse.input ? JSON.parse(currentToolUse.input) : {}
                } catch {
                  logger.warn(
                    { toolUseId: currentToolUse.id, input: currentToolUse.input },
                    '[DEV] Failed to parse tool input'
                  )
                }

                contentBlocks.push({
                  type: 'tool_use',
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: parsedInput,
                })

                logger.debug(
                  { toolName: currentToolUse.name, inputKeys: Object.keys(parsedInput) },
                  '[DEV] Tool use completed'
                )

                safeEnqueue(JSON.stringify({
                  type: 'tool_use',
                  toolUse: {
                    type: 'tool_use',
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: parsedInput,
                  },
                }))
                currentToolUse = null
              } else if (fullTextResponse) {
                contentBlocks.push({
                  type: 'text',
                  text: fullTextResponse,
                })
              }
            } else if (event.type === 'message_delta') {
              if (event.usage) {
                outputTokens = event.usage.output_tokens
                safeEnqueue(JSON.stringify({
                  type: 'metrics_update',
                  metrics: {
                    inputTokens,
                    outputTokens,
                    costCents: calculateCostInCents(model, inputTokens, outputTokens),
                  },
                }))
              }
            }
          }

          const finalMessage = await anthropicStream.finalMessage()
          const stopReason = finalMessage.stop_reason
          const cacheReadTokens = finalMessage.usage.cache_read_input_tokens || 0
          const cacheCreationTokens = finalMessage.usage.cache_creation_input_tokens || 0

          const costCents = calculateCostInCents(
            model,
            inputTokens,
            outputTokens
          )

          logger.info(
            {
              model,
              inputTokens,
              outputTokens,
              cacheReadTokens,
              cacheCreationTokens,
              stopReason,
              contentDeltaCount,
              toolUseCount,
              textLength: fullTextResponse.length,
            },
            '[DEV] Agent stream completed'
          )

          // DEV LOGGING: Log response from LLM
          await devLogger.logResponse(fullTextResponse, {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_read_input_tokens: cacheReadTokens,
            cache_creation_input_tokens: cacheCreationTokens,
          })

          // Determine if this is the final turn of the agentic loop
          const isFinalTurn = stopReason !== 'tool_use'

          // Save messages only on appropriate turns (same logic as production)
          const assistantToolCalls = contentBlocks.filter(b => b.type === "tool_use");
          const hasContent = fullTextResponse.trim().length > 0 || assistantToolCalls.length > 0;

          const MAX_CONTEXT_TOKENS = 200000;
          const newContextTokens = Math.min(inputTokens + outputTokens, MAX_CONTEXT_TOKENS);

          await db.transaction(async (tx) => {
            // Save user message on first turn only
            if (isFirstTurn && userMessage) {
              await tx.insert(messages).values({
                chatId,
                role: "user",
                content: userMessage,
                model: null,
                inputTokens: 0,
                outputTokens: 0,
                costCents: 0,
              });
            }

            // Only save assistant message on FINAL turn
            if (isFinalTurn && hasContent) {
              await tx.insert(messages).values({
                chatId,
                role: "assistant",
                content: fullTextResponse,
                model,
                inputTokens,
                outputTokens,
                costCents,
                toolCalls: assistantToolCalls.length > 0 ? JSON.stringify(assistantToolCalls) : null,
              });
            }

            // Update context tokens on final turn only
            if (isFinalTurn) {
              await tx
                .update(chats)
                .set({
                  contextTokens: newContextTokens,
                  contextInputTokens: inputTokens,
                  contextOutputTokens: outputTokens,
                  updatedAt: new Date(),
                })
                .where(eq(chats.id, chatId));
            }
          });

          safeEnqueue(JSON.stringify({
            type: 'execution_complete',
            finalOutput: fullTextResponse,
            metrics: {
              inputTokens,
              outputTokens,
              costCents,
            },
          }))

          safeEnqueue(JSON.stringify({
            type: 'done',
            stopReason,
            usage: {
              inputTokens,
              outputTokens,
              costCents,
            },
            contentBlocks,
          }))

          safeClose()
        } catch (err) {
          logger.error(
            {
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            },
            '[DEV] Agent streaming error'
          )

          // Parse error to provide user-friendly messages
          let userFriendlyError = "Something went wrong. Please try again."
          let errorCode: string | undefined

          if (err instanceof Error) {
            const errMessage = err.message

            if (errMessage.includes("rate_limit_error") || errMessage.startsWith("429")) {
              userFriendlyError = "AI service is temporarily busy. Please wait a moment and try again."
              errorCode = "ANTHROPIC_RATE_LIMIT"
            } else if (errMessage.includes("overloaded") || errMessage.startsWith("529")) {
              userFriendlyError = "AI service is experiencing high demand. Please try again in a few minutes."
              errorCode = "ANTHROPIC_OVERLOADED"
            } else if (errMessage.includes("authentication") || errMessage.includes("api_key")) {
              userFriendlyError = "Service configuration error. Please contact support."
              errorCode = "ANTHROPIC_AUTH_ERROR"
            } else if (errMessage.includes("invalid_request")) {
              userFriendlyError = "Invalid request. Please try a different message."
              errorCode = "ANTHROPIC_INVALID_REQUEST"
            } else {
              userFriendlyError = "Something went wrong. Please try again."
              errorCode = "STREAMING_ERROR"
            }
          }

          safeEnqueue(JSON.stringify({
            type: 'error',
            error: userFriendlyError,
            code: errorCode,
          }))

          safeClose()
        }
      },
      cancel() {
        controllerClosed = true
      }
    })

    logger.debug({}, '[DEV] Stream response created, returning to client')

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    logger.error(
      {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      '[DEV] Agent chat endpoint error'
    )
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
