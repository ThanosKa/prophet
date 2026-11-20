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

/**
 * The narrow view of Claude's stream this module reads: the SDK's `MessageStream` in
 * production, a fake stream in tests.
 */
export type TurnEventStream = AsyncIterable<MessageStreamEvent> & { finalMessage(): Promise<Message> }

/** The first frame of every Turn; `runId` names the Run on a first Turn and a Run continuation. */
export type SessionCreatedFrame = { type: 'session_created'; sessionId: string; runId?: string }

/** A Turn's usage as the extension shows it, with `inputTokens` as the whole prompt. */
export type ReportedUsage = {
  inputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  outputTokens: number
  costCents: number
}

/** The frames sent while Claude streams, before the Turn ends. */
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

/** A Turn that reached its final message. */
export type FinishedTurn = {
  stopReason: StopReason | null
  /** The final usage, which is the bill, with the web searches Anthropic billed. */
  usage: Required<TokenUsage>
  /** The reply text. */
  text: string
  /** Held back while streaming; the Turn's ending decides whether they are released. */
  clientToolCalls: StoredToolCall[]
  /** The API's own blocks, which replay must echo untouched. */
  echoableContent: ContentBlockParam[]
  citations: Citation[]
  refusalCategory: RefusalStopDetails['category']
  /**
   * True when Claude asked for tools, or paused a long server-tool Turn (`pause_turn`)
   * for the client to resume: the Run goes on unless this is its last Turn.
   */
  runContinues: boolean
}

export type TurnStreamResult =
  | { ended: 'finished'; final: FinishedTurn; partial: PartialTurn }
  | { ended: 'cut_short'; error: unknown; partial: PartialTurn }

/** The frame that ends a Turn cut short by an error. Undefined fields are left out of the JSON. */
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

    // Handle Anthropic rate limit errors (429)
    if (errMessage.includes('rate_limit_error') || errMessage.startsWith('429')) {
      userFriendlyError = 'AI service is temporarily busy. Please wait a moment and try again.'
      errorCode = 'ANTHROPIC_RATE_LIMIT'
      // Try to extract retry info from error
      const retryMatch = errMessage.match(/try again later/i)
      if (retryMatch) {
        errorDetails = { retryAfter: 60 }
      }
    }
    // Handle Anthropic overloaded errors (529)
    else if (errMessage.includes('overloaded') || errMessage.startsWith('529')) {
      userFriendlyError = 'AI service is experiencing high demand. Please try again in a few minutes.'
      errorCode = 'ANTHROPIC_OVERLOADED'
    }
    // Handle authentication errors
    else if (errMessage.includes('authentication') || errMessage.includes('api_key')) {
      userFriendlyError = 'Service configuration error. Please contact support.'
      errorCode = 'ANTHROPIC_AUTH_ERROR'
    }
    // For other errors, use a generic message (don't expose raw error to user)
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
  // What settlement charges if the Turn ends here: the usage so far, with the web
  // searches that started.
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
    // Held back until the Turn ends cleanly with `tool_use`: a call released
    // mid-stream would run even when the Turn is then cut off or refused.
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
          let parsedInput = {}
          try {
            // Robust parsing: handle potential hallucinations or malformed JSON
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
            // Anthropic runs this one; the client must never try to execute it.
            send({
              type: 'web_search_start',
              toolUseId: currentToolUse.id,
              query: (parsedInput as { query?: string }).query ?? '',
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
              costCents: calculateUsageCostInCredits(model, turnUsage(webSearchesStarted)),
            }),
          })
        }
      }
    }

    const finalMessage = await anthropicStream.finalMessage()
    const stopReason = finalMessage.stop_reason
    // message_start predates any server-tool iterations, which add input and
    // cache tokens; the final usage is the authoritative bill.
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
        // The API's own blocks are authoritative for replay: they carry the
        // encrypted web-search payloads that must round-trip untouched.
        echoableContent: toEchoableContent(finalMessage.content),
        citations: extractCitations(finalMessage.content),
        refusalCategory: finalMessage.stop_details?.category ?? null,
        // `pause_turn` means Anthropic stopped a long server-tool turn early and
        // the client has to replay the assistant turn, so it is not final either.
        runContinues: stopReason === 'tool_use' || stopReason === 'pause_turn',
      },
      partial: partialTurn(),
    }
  } catch (error) {
    return { ended: 'cut_short', error, partial: partialTurn() }
  }
}

/** Where the web searches Anthropic billed show up, beside the Turn's usage. */
type ClosingUsage = ReportedUsage & { webSearchRequests: number; webSearchCostCents: number }

/** The frames that end a finished Turn, in the order they are sent. */
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

  // Safety classifiers decline with HTTP 200 and no answer; without an error the
  // extension would end the run on a blank reply.
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
