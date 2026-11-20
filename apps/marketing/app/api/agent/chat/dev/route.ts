import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { messages, chats } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { anthropic } from '@/lib/anthropic'
import { AGENT_TOOLS } from '@/lib/agent/tools'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent/system-prompt'
import { AGENT_TURN_MAX_TOKENS, buildAgentTools, buildOutputConfig, buildThinkingConfig } from '@/lib/agent/web-search'
import {
  agentChatRequestSchema,
  DEFAULT_AGENT_MODEL,
  getModelContextWindow,
  resolveAgentModel,
  sanitizeForLog,
} from '@prophet/shared'
import { error, INTERNAL_ERROR_MESSAGE } from '@/types'
import { logger } from '@/lib/logger'
import { calculateUsageCostInCredits, type ModelName } from '@/lib/pricing'
import { estimateInputTokens } from '@/lib/credit-reservation'
import { lastTurnReason, withLastTurnNotice } from '@/lib/agent/last-turn'
import { closingFrames, describeTurnError, readTurnStream } from '@/lib/agent/turn-stream'
import { buildAgentMessages, resolveRunTurns } from '@/lib/agent/conversation'
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

    const {
      chatId,
      userMessage,
      runId,
      previousTurns,
      toolResults,
      previousContent,
      image,
      enableThinking,
      enableWebSearch,
    } = validation.data
    const model = resolveAgentModel(
      validation.data.model ?? DEFAULT_AGENT_MODEL
    ) as ModelName

    const isFirstTurn = !!userMessage
    const runTurns = resolveRunTurns({ previousTurns, previousContent, toolResults })
    if (!isFirstTurn && runTurns.length === 0) {
      logger.warn({}, '[DEV] Neither userMessage nor toolResults provided')
      return NextResponse.json(
        error('Either userMessage or toolResults is required', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    const history = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    })
    const builtMessages = buildAgentMessages({ history, userMessage, image, runTurns })
    const tools = buildAgentTools(AGENT_TOOLS, enableWebSearch)
    const runEnd = lastTurnReason({
      runTurns,
      hasRunId: runId !== undefined,
      estimatedPromptTokens: estimateInputTokens({
        system: AGENT_SYSTEM_PROMPT,
        tools,
        messages: builtMessages,
      }),
    })
    const anthropicMessages = runEnd ? withLastTurnNotice(builtMessages) : builtMessages
    // Production names the Run on a first Turn and on a continuation that sends its id.
    const sessionRunId = isFirstTurn ? crypto.randomUUID() : runId

    logger.debug(
      { model, messageCount: anthropicMessages.length, runTurns: runTurns.length },
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

        try {
          logger.debug({ model, maxTokens: AGENT_TURN_MAX_TOKENS, enableThinking }, '[DEV] Creating Anthropic stream')

          const thinkingConfig = buildThinkingConfig(enableThinking)
          const outputConfig = buildOutputConfig(enableThinking)

          const turn = await readTurnStream({
            open: async () =>
              anthropic.messages.stream({
                model,
                max_tokens: AGENT_TURN_MAX_TOKENS,
                cache_control: { type: 'ephemeral' },
                system: [
                  {
                    type: 'text',
                    text: AGENT_SYSTEM_PROMPT,
                    cache_control: { type: 'ephemeral' },
                  },
                ],
                tools,
                messages: anthropicMessages,
                ...(thinkingConfig && { thinking: thinkingConfig }),
                ...(outputConfig && { output_config: outputConfig }),
              }),
            sessionFrame: {
              type: 'session_created',
              sessionId: chatId,
              ...(sessionRunId !== undefined && { runId: sessionRunId }),
            },
            model,
            send: (frame) => safeEnqueue(JSON.stringify(frame)),
          })
          if (turn.ended === 'cut_short') throw turn.error

          const { final } = turn
          const { stopReason } = final
          const { inputTokens, cacheCreationInputTokens, cacheReadInputTokens, outputTokens } = final.usage
          const fullTextResponse = final.text
          const costCents = calculateUsageCostInCredits(model, final.usage)

          logger.info(
            {
              model,
              inputTokens,
              outputTokens,
              cacheReadInputTokens,
              cacheCreationInputTokens,
              stopReason,
              toolUseCount: final.clientToolCalls.length,
              textLength: fullTextResponse.length,
            },
            '[DEV] Agent stream completed'
          )

          // DEV LOGGING: Log response from LLM
          await devLogger.logResponse(fullTextResponse, {
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_read_input_tokens: cacheReadInputTokens,
            cache_creation_input_tokens: cacheCreationInputTokens,
          })

          // Determine if this is the final turn of the agentic loop
          const isFinalTurn = runEnd !== null || !final.runContinues

          // Save messages only on appropriate turns (same logic as production)
          const assistantToolCalls = final.clientToolCalls;
          const hasContent = fullTextResponse.trim().length > 0 || assistantToolCalls.length > 0;

          const promptTokens = inputTokens + cacheCreationInputTokens + cacheReadInputTokens;
          const newContextTokens = Math.min(promptTokens + outputTokens, getModelContextWindow(model));

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
                  contextInputTokens: promptTokens,
                  contextOutputTokens: outputTokens,
                  contextCachedInputTokens: cacheReadInputTokens,
                  updatedAt: new Date(),
                })
                .where(eq(chats.id, chatId));
            }
          });

          for (const frame of closingFrames({
            final,
            costCents,
            runEnd,
            maxTokensReducedForBalance: false,
          })) {
            safeEnqueue(JSON.stringify(frame))
          }

          safeClose()
        } catch (err) {
          logger.error(
            {
              error: err instanceof Error ? err.message : String(err),
              stack: err instanceof Error ? err.stack : undefined,
            },
            '[DEV] Agent streaming error'
          )

          safeEnqueue(JSON.stringify(describeTurnError(err)))

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
      error(INTERNAL_ERROR_MESSAGE, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
