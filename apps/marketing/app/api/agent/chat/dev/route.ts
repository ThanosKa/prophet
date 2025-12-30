import { NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { AGENT_TOOLS } from '@/lib/agent/tools'
import { AGENT_SYSTEM_PROMPT, AGENT_MAX_TOKENS } from '@/lib/agent/system-prompt'
import { agentChatRequestSchema, DEFAULT_AGENT_MODEL, sanitizeForLog } from '@prophet/shared'
import { error } from '@/types'
import { logger } from '@/lib/logger'
import type { ModelName } from '@/lib/pricing'
import type { MessageParam, ContentBlockParam } from '@anthropic-ai/sdk/resources/messages'

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

    const { userMessage, toolResults, previousContent } = validation.data
    const model = (validation.data.model ?? DEFAULT_AGENT_MODEL) as ModelName

    logger.debug(
      { model, userMessage: !!userMessage, toolResults: !!toolResults, previousContent: !!previousContent },
      '[DEV] Request parameters'
    )

    const anthropicMessages: MessageParam[] = []

    if (userMessage) {
      logger.debug({ messageLength: userMessage.length }, '[DEV] Building initial message')
      anthropicMessages.push({
        role: 'user',
        content: userMessage,
      })
    } else if (toolResults && previousContent) {
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

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullTextResponse = ''
        let inputTokens = 0
        let outputTokens = 0
        let contentDeltaCount = 0
        let toolUseCount = 0
        const contentBlocks: ContentBlockParam[] = []

        try {
          logger.debug({ model, maxTokens: AGENT_MAX_TOKENS }, '[DEV] Creating Anthropic stream')

          const anthropicStream = await anthropic.messages.stream({
            model,
            max_tokens: AGENT_MAX_TOKENS,
            system: AGENT_SYSTEM_PROMPT,
            tools: AGENT_TOOLS,
            messages: anthropicMessages,
          })

          logger.debug({}, '[DEV] Anthropic stream created, processing events')

          let currentToolUse: { id: string; name: string; input: string } | null = null

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
                const data = JSON.stringify({
                  type: 'tool_use_start',
                  id: event.content_block.id,
                  name: event.content_block.name,
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
              }
            } else if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                contentDeltaCount++
                const text = event.delta.text
                fullTextResponse += text
                const data = JSON.stringify({
                  type: 'content_delta',
                  content: text,
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
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

                const data = JSON.stringify({
                  type: 'tool_use',
                  id: currentToolUse.id,
                  name: currentToolUse.name,
                  input: parsedInput,
                })
                controller.enqueue(encoder.encode(`data: ${data}\n\n`))
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
              }
            }
          }

          const finalMessage = await anthropicStream.finalMessage()
          const stopReason = finalMessage.stop_reason

          logger.info(
            {
              model,
              inputTokens,
              outputTokens,
              stopReason,
              contentDeltaCount,
              toolUseCount,
              textLength: fullTextResponse.length,
            },
            '[DEV] Agent stream completed'
          )

          const doneData = JSON.stringify({
            type: 'done',
            stopReason,
            usage: {
              inputTokens,
              outputTokens,
              costCents: 0,
            },
            contentBlocks,
          })
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))

          controller.close()
        } catch (err) {
          logger.error(
            {
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            },
            '[DEV] Agent streaming error'
          )

          const errorData = JSON.stringify({
            type: 'error',
            error: err instanceof Error ? err.message : 'Streaming failed',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))

          controller.close()
        }
      },
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
