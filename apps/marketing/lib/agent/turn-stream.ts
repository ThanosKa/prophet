import { APIError, BadRequestError } from '@anthropic-ai/sdk'
import type {
  ContentBlock,
  ContentBlockParam,
  Message,
  MessageStreamEvent,
  RefusalStopDetails,
  StopReason,
} from '@anthropic-ai/sdk/resources/messages'
import { errorMessage, type RunEnd, type StoredToolCall } from '@prophet/shared'
import { isToolInput } from '@/lib/agent/run-record'
import { toEchoableContent } from '@/lib/agent/web-search'
import { logger } from '@/lib/logger'
import {
  calculateUsageCostInCredits,
  calculateWebSearchCostInCredits,
  type ModelName, type TokenUsage,
} from '@/lib/pricing'
import type { PartialTurn } from '@/lib/turn-hold'

function searchQueryOf(input: unknown): string {
  return isToolInput(input) && typeof input.query === 'string' ? input.query : ''
}

export type TurnEventStream = AsyncIterable<MessageStreamEvent> & { finalMessage(): Promise<Message> }

export type SessionCreatedFrame = { type: 'session_created'; sessionId: string; runId?: string }

export type ReportedUsage = {
  inputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  outputTokens: number
  costCents: number
}

export type LiveFrame =
  | { type: 'content_delta'; delta: string }
  | { type: 'thinking_delta'; delta: string }
  | { type: 'web_search_start'; toolUseId: string; query: string }
  | {
      type: 'web_search_results'
      toolUseId: string
      sources: Array<{ url: string; title: string; pageAge: string | null }>
    }
  | { type: 'web_search_error'; toolUseId: string; errorCode: string }
  | { type: 'metrics_update'; metrics: ReportedUsage }

export type Citation = { url: string; title: string; citedText: string }

export type FinishedTurn = {
  stopReason: StopReason | null
  usage: Required<TokenUsage>
  text: string
  clientToolCalls: StoredToolCall[]
  echoableContent: ContentBlockParam[]
  citations: Citation[]
  refusalCategory: RefusalStopDetails['category']
  runContinues: boolean
}

export type TurnStreamResult =
  | { ended: 'finished'; final: FinishedTurn; partial: PartialTurn }
  | { ended: 'cut_short'; error: unknown; partial: PartialTurn }

export type ErrorFrame = {
  type: 'error'
  error: string
  code?: string
  details?: Record<string, unknown>
}

function describeInvalidRequest(err: unknown): { message: string; code: string } | null {
  if (!(err instanceof Error)) return null
  const isInvalidRequest =
    err instanceof BadRequestError ||
    (err instanceof APIError && err.type === 'invalid_request_error') ||
    err.message.includes('invalid_request')
  if (!isInvalidRequest) return null

  const text = err.message.toLowerCase()
  if (
    text.includes('prompt is too long') ||
    text.includes('too many tokens') ||
    text.includes('context')
  ) {
    return {
      message: 'This chat is too long for the model. Start a new chat to continue.',
      code: 'CONTEXT_TOO_LONG',
    }
  }
  if (text.includes('image')) {
    return {
      message: 'That image is too large or unsupported. Try a smaller image.',
      code: 'IMAGE_INVALID',
    }
  }
  return {
    message: "Claude couldn't process this request. Start a new chat and try again.",
    code: 'ANTHROPIC_INVALID_REQUEST',
  }
}

/**
 * The user-facing error frame for a Turn cut short by `err`: never the raw error, which
 * goes to the log instead.
 */
export function describeTurnError(err: unknown): ErrorFrame {
  let userFriendlyError = 'Something went wrong. Please try again.'
  let errorCode: string | undefined
  let errorDetails: Record<string, unknown> | undefined

  const invalidRequest = describeInvalidRequest(err)
  if (invalidRequest) {
    userFriendlyError = invalidRequest.message
    errorCode = invalidRequest.code
  } else if (err instanceof Error) {
    const errMessage = err.message

    if (errMessage.includes('rate_limit_error') || errMessage.startsWith('429')) {
      userFriendlyError = 'AI service is temporarily busy. Please wait a moment and try again.'
      errorCode = 'ANTHROPIC_RATE_LIMIT'
      const retryMatch = errMessage.match(/try again later/i)
      if (retryMatch) {
        errorDetails = { retryAfter: 60 }
      }
    }
    else if (errMessage.includes('overloaded') || errMessage.startsWith('529')) {
      userFriendlyError = 'AI service is experiencing high demand. Please try again in a few minutes.'
      errorCode = 'ANTHROPIC_OVERLOADED'
    }
    else if (errMessage.includes('authentication') || errMessage.includes('api_key')) {
      userFriendlyError = 'Service configuration error. Please contact support.'
      errorCode = 'ANTHROPIC_AUTH_ERROR'
    }
    else {
      userFriendlyError = 'Something went wrong. Please try again.'
      errorCode = 'STREAMING_ERROR'
    }
  }

  return {
    type: 'error',
    error: userFriendlyError,
    code: errorCode,
    details: errorDetails,
  }
}

/** The extension shows `inputTokens` as context size, so it carries the whole prompt;
 * Anthropic's own `input_tokens` is only the uncached remainder. */
export function reportedUsage({ usage, costCents }: { usage: TokenUsage; costCents: number }): ReportedUsage {
  return {
    inputTokens: usage.inputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens,
    cacheCreationInputTokens: usage.cacheCreationInputTokens,
    cacheReadInputTokens: usage.cacheReadInputTokens,
    outputTokens: usage.outputTokens,
    costCents,
  }
}

function extractCitations(blocks: ContentBlock[]): Citation[] {
  const seen = new Set<string>()
  const citations: Citation[] = []

  for (const block of blocks) {
    if (block.type !== 'text' || !block.citations) continue
    for (const citation of block.citations) {
      if (citation.type !== 'web_search_result_location') continue
      if (seen.has(citation.url)) continue
      seen.add(citation.url)
      citations.push({
        url: citation.url,
        title: citation.title ?? citation.url,
        citedText: citation.cited_text,
      })
    }
  }

  return citations
}

/**
 * Reads one Turn of Claude's stream: opens it through `open`, sends `session_created`
 * once it is open, then the live frames as they stream. Client tool calls are held back
 * in the result, never sent. Never throws: on Stop or an error it returns `cut_short`
 * with what was measured so far.
 */
export async function readTurnStream({
  open,
  sessionFrame,
  model,
  send,
}: {
  open: () => Promise<TurnEventStream>
  sessionFrame: SessionCreatedFrame
  model: ModelName
  send: (frame: LiveFrame | SessionCreatedFrame) => void
}): Promise<TurnStreamResult> {
  let fullTextResponse = ''
  let streamedOutput = ''
  let inputTokens = 0
  let cacheCreationInputTokens = 0
  let cacheReadInputTokens = 0
  let outputTokens = 0
  let webSearchesStarted = 0
  let usageReported = false

  const turnUsage = (webSearchRequests: number): Required<TokenUsage> => ({
    inputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    outputTokens,
    webSearchRequests,
  })
  const partialTurn = (): PartialTurn => ({
    usageReported,
    usage: turnUsage(webSearchesStarted),
    streamedOutput,
    text: fullTextResponse,
  })

  try {
    const anthropicStream = await open()

    let currentToolUse: {
      id: string
      name: string
      input: string
      isServerTool: boolean
    } | null = null
    const clientToolCalls: StoredToolCall[] = []

    send(sessionFrame)

    for await (const event of anthropicStream) {
      if (event.type === 'message_start') {
        inputTokens = event.message.usage.input_tokens
        cacheCreationInputTokens = event.message.usage.cache_creation_input_tokens ?? 0
        cacheReadInputTokens = event.message.usage.cache_read_input_tokens ?? 0
        usageReported = true
      } else if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            input: '',
            isServerTool: false,
          }
        } else if (event.content_block.type === 'server_tool_use') {
          webSearchesStarted += 1
          currentToolUse = {
            id: event.content_block.id,
            name: event.content_block.name,
            input: '',
            isServerTool: true,
          }
        } else if (event.content_block.type === 'web_search_tool_result') {
          const result = event.content_block
          send(
            Array.isArray(result.content)
              ? {
                  type: 'web_search_results',
                  toolUseId: result.tool_use_id,
                  sources: result.content.map((r) => ({
                    url: r.url,
                    title: r.title,
                    pageAge: r.page_age ?? null,
                  })),
                }
              : {
                  type: 'web_search_error',
                  toolUseId: result.tool_use_id,
                  errorCode: result.content.error_code,
                }
          )
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          const text = event.delta.text
          fullTextResponse += text
          streamedOutput += text
          send({ type: 'content_delta', delta: text })
        } else if (event.delta.type === 'thinking_delta') {
          streamedOutput += event.delta.thinking
          send({ type: 'thinking_delta', delta: event.delta.thinking })
        } else if (event.delta.type === 'input_json_delta' && currentToolUse) {
          currentToolUse.input += event.delta.partial_json
          streamedOutput += event.delta.partial_json
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolUse) {
          let parsedInput: unknown = {}
          try {
            const rawInput = currentToolUse.input.trim()
            parsedInput = rawInput ? JSON.parse(rawInput) : {}
          } catch (e) {
            logger.warn(
              {
                toolUseId: currentToolUse.id,
                input: currentToolUse.input,
                error: errorMessage(e),
              },
              'Failed to parse tool input, using empty object'
            )
          }

          if (currentToolUse.isServerTool) {
            send({
              type: 'web_search_start',
              toolUseId: currentToolUse.id,
              query: searchQueryOf(parsedInput),
            })
          } else {
            clientToolCalls.push({
              type: 'tool_use',
              id: currentToolUse.id,
              name: currentToolUse.name,
              input: isToolInput(parsedInput) ? parsedInput : {},
            })
          }
          currentToolUse = null
        }
      } else if (event.type === 'message_delta') {
        if (event.usage) {
          outputTokens = event.usage.output_tokens
          send({
            type: 'metrics_update',
            metrics: reportedUsage({
              usage: turnUsage(webSearchesStarted),
              costCents: calculateUsageCostInCredits({ model, usage: turnUsage(webSearchesStarted) }),
            }),
          })
        }
      }
    }

    const finalMessage = await anthropicStream.finalMessage()
    const stopReason = finalMessage.stop_reason
    inputTokens = finalMessage.usage.input_tokens
    cacheCreationInputTokens = finalMessage.usage.cache_creation_input_tokens ?? 0
    cacheReadInputTokens = finalMessage.usage.cache_read_input_tokens ?? 0
    outputTokens = finalMessage.usage.output_tokens
    const webSearchRequests = finalMessage.usage.server_tool_use?.web_search_requests ?? 0

    return {
      ended: 'finished',
      final: {
        stopReason,
        usage: turnUsage(webSearchRequests),
        text: fullTextResponse,
        clientToolCalls,
        /*
         * The API's own blocks are authoritative for replay: they carry the
         * encrypted web-search payloads that must round-trip untouched.
         * https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool
         */
        echoableContent: toEchoableContent(finalMessage.content),
        citations: extractCitations(finalMessage.content),
        refusalCategory: finalMessage.stop_details?.category ?? null,
        /*
         * `pause_turn` means Anthropic stopped a long server-tool turn early and
         * the client has to replay the assistant turn, so it is not final either.
         * https://docs.claude.com/en/api/handling-stop-reasons
         */
        runContinues: stopReason === 'tool_use' || stopReason === 'pause_turn',
      },
      partial: partialTurn(),
    }
  } catch (error) {
    return { ended: 'cut_short', error, partial: partialTurn() }
  }
}

type ClosingUsage = ReportedUsage & { webSearchRequests: number; webSearchCostCents: number }

export type ClosingFrame =
  | { type: 'error'; error: string; code: string }
  | { type: 'tool_use'; toolUse: StoredToolCall }
  | { type: 'citations'; citations: Citation[] }
  | {
      type: 'execution_complete'
      stopReason: StopReason | null
      finalOutput: string
      metrics: ClosingUsage
    }
  | {
      type: 'done'
      stopReason: StopReason | null
      usage: ClosingUsage
      citations: Citation[]
      contentBlocks: ContentBlockParam[]
      maxTokensReducedForBalance: boolean
      runEnd?: RunEnd
    }

/**
 * The client tool calls a finished Turn releases. Only a clean `tool_use` stop releases
 * any: every other ending ran none of them, and on `max_tokens` the last one is cut off
 * mid-input. A Run's last Turn (`runEnd` set) releases none whatever Claude does: the Run
 * ends with its text as the reply. The Run record and the `tool_use` frames both read
 * this, so they cannot disagree.
 */
export function releasedToolCalls({
  final,
  runEnd,
}: {
  final: FinishedTurn
  runEnd: RunEnd | null
}): StoredToolCall[] {
  return final.stopReason === 'tool_use' && runEnd === null ? final.clientToolCalls : []
}

/**
 * The frames that end a finished Turn, built after settlement and sent as they are.
 * A refused Turn gets only the error frame; any other Turn gets the released `tool_use`
 * frames, then `citations` if there are any, then `execution_complete`, then `done`.
 * Pure: it does not log, send or read the clock.
 */
export function closingFrames({
  final,
  costCents,
  runEnd,
  maxTokensReducedForBalance,
}: {
  final: FinishedTurn
  costCents: number
  runEnd: RunEnd | null
  maxTokensReducedForBalance: boolean
}): ClosingFrame[] {
  const { stopReason, citations } = final

  /*
   * Safety classifiers decline with HTTP 200 and no answer; without an error the
   * extension would end the run on a blank reply.
   * https://docs.claude.com/en/api/handling-stop-reasons
   */
  if (stopReason === 'refusal') {
    return [
      {
        type: 'error',
        error: 'Claude declined this request. Try rephrasing it or start a new chat.',
        code: 'MODEL_REFUSED',
      },
    ]
  }

  const usage: ClosingUsage = {
    ...reportedUsage({ usage: final.usage, costCents }),
    webSearchRequests: final.usage.webSearchRequests,
    webSearchCostCents: calculateWebSearchCostInCredits(final.usage.webSearchRequests),
  }
  const contentBlocks =
    stopReason === 'max_tokens'
      ? final.echoableContent.filter((block) => block.type !== 'tool_use')
      : final.echoableContent

  return [
    ...releasedToolCalls({ final, runEnd }).map((toolUse): ClosingFrame => ({ type: 'tool_use', toolUse })),
    ...(citations.length > 0 ? [{ type: 'citations', citations } as const] : []),
    {
      type: 'execution_complete',
      stopReason,
      finalOutput: final.text,
      metrics: usage,
    },
    {
      type: 'done',
      stopReason,
      usage,
      citations,
      contentBlocks,
      maxTokensReducedForBalance,
      ...(runEnd && { runEnd }),
    },
  ]
}
