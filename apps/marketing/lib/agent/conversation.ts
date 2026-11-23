import type {
  ContentBlockParam,
  MessageParam,
  WebSearchResultBlockParam,
  WebSearchToolResultBlockParamContent,
} from '@anthropic-ai/sdk/resources/messages'
import {
  AGENT_SIZE_LIMITS,
  HISTORY_BUDGET_TOKENS,
  keepChars,
  parseStoredToolCalls,
  type AgentChatRequest,
  type AgentTurn,
  type ContentBlock,
  type ImageData,
} from '@prophet/shared'
import type { HistoryRow } from '@/lib/agent/run-record'
import { estimateTextTokens } from '@/lib/credit-reservation'

function capText(text: string): string {
  const max = AGENT_SIZE_LIMITS.recordTextChars
  if (text.length <= max) return text
  const head = keepChars({ text, count: max / 2 })
  const tail = keepChars({ text, count: max / 2, from: 'end' })
  return `${head}\n[… ${text.length - head.length - tail.length} characters left out …]\n${tail}`
}

function capActionInput(input: Record<string, unknown>): string {
  const json = JSON.stringify(input)
  const kept = keepChars({ text: json, count: AGENT_SIZE_LIMITS.recordActionInputChars })
  return kept === json ? json : `${kept}…`
}

function renderStoredMessage(row: HistoryRow): string {
  if (row.role === 'user') return row.content
  const actions = parseStoredToolCalls(row.toolCalls).map(
    (call) => `- ${call.name} ${capActionInput(call.input)}${call.isError ? ' (failed)' : ''}`
  )
  const text = capText(row.content)
  if (actions.length === 0) return text
  const list = `Actions taken:\n${actions.join('\n')}`
  return text === '' ? list : `${text}\n\n${list}`
}

/**
 * The history window: the newest of the rows strictly older than a Run's opening row
 * whose rendered size fits `HISTORY_BUDGET_TOKENS`. The newest row is always kept, so
 * "continue" never loses the previous Run's record. A window never starts with an
 * assistant row, because a prompt must open with a user message.
 *
 * Every Turn of a Run passes the same rows and so gets the same window: the bytes before
 * the opening message never change, which keeps the prompt cache and replayed thinking valid.
 */
export function windowHistory(rows: HistoryRow[]): HistoryRow[] {
  let start = rows.length
  let used = 0
  while (start > 0) {
    const row = rows[start - 1]
    if (!row) break
    const size = estimateTextTokens(renderStoredMessage(row))
    if (start < rows.length && used + size > HISTORY_BUDGET_TOKENS) break
    used += size
    start -= 1
  }
  let userStart = start
  while (userStart < rows.length && rows[userStart]?.role !== 'user') userStart += 1
  if (userStart < rows.length) return rows.slice(userStart)
  while (start > 0 && rows[start]?.role !== 'user') start -= 1
  return rows.slice(start)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSearchResultParam(value: unknown): value is WebSearchResultBlockParam {
  return (
    isRecord(value) &&
    value.type === 'web_search_result' &&
    typeof value.url === 'string' &&
    typeof value.title === 'string' &&
    typeof value.encrypted_content === 'string'
  )
}

function isSearchResultContent(value: unknown): value is WebSearchToolResultBlockParamContent {
  if (Array.isArray(value)) return value.every(isSearchResultParam)
  return isRecord(value) && value.type === 'web_search_tool_result_error' && typeof value.error_code === 'string'
}

function isContentBlockParam<T>(block: T): block is T & ContentBlockParam {
  if (!isRecord(block)) return false
  switch (block.type) {
    case 'text':
      return typeof block.text === 'string'
    case 'thinking':
      return typeof block.thinking === 'string' && typeof block.signature === 'string'
    case 'redacted_thinking':
      return typeof block.data === 'string'
    case 'tool_use':
      return typeof block.id === 'string' && typeof block.name === 'string' && 'input' in block
    case 'server_tool_use':
      return typeof block.id === 'string' && block.name === 'web_search' && 'input' in block
    case 'web_search_tool_result':
      return typeof block.tool_use_id === 'string' && isSearchResultContent(block.content)
    default:
      return false
  }
}

function echoedContent(content: ContentBlock[]): ContentBlockParam[] {
  return content.map((block) => {
    if (isContentBlockParam(block)) return block
    throw new Error(`A ${block.type} block lacks a field Anthropic requires`)
  })
}

function userContent({
  text,
  image,
}: {
  text: string
  image: ImageData | undefined
}): MessageParam['content'] {
  if (!image) return text
  return [
    {
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.base64 },
    },
    { type: 'text', text },
  ]
}

/**
 * Earlier turns of the current run. Installed extension builds send only the latest
 * turn as `previousContent` + `toolResults`; newer ones send the whole run. A
 * `pause_turn` resume is a turn with no tool results: the assistant turn is replayed
 * on its own so the server tool can finish.
 */
export function resolveRunTurns({
  previousTurns,
  previousContent,
  toolResults,
}: Pick<AgentChatRequest, 'previousTurns' | 'previousContent' | 'toolResults'>): AgentTurn[] {
  if (previousTurns) return previousTurns
  return previousContent && previousContent.length > 0
    ? [{ content: previousContent, toolResults: toolResults ?? [] }]
    : []
}

/**
 * Rebuilds the prompt for one request of an agent run. Every request of a run must
 * start with the previous request's messages unchanged, or the prompt cache misses
 * and replayed thinking blocks no longer match their history.
 *
 * The run's opening user message is saved before its first turn, and its record is
 * the assistant row after it, so a continuation drops that trailing row and finds
 * the opening message at the end of the stored history. Only the history window of
 * the rows before the opening message is sent.
 */
export function buildAgentMessages({
  history,
  userMessage,
  image,
  runTurns,
}: {
  history: HistoryRow[]
  userMessage: string | undefined
  image: ImageData | undefined
  runTurns: AgentTurn[]
}): MessageParam[] {
  const render = (rows: HistoryRow[]): MessageParam[] =>
    windowHistory(rows).map((row) => ({ role: row.role, content: renderStoredMessage(row) }))

  if (userMessage) {
    return [...render(history), { role: 'user', content: userContent({ text: userMessage, image }) }]
  }

  const rows = history.at(-1)?.role === 'assistant' ? history.slice(0, -1) : history
  const opening = rows.at(-1)
  const messages: MessageParam[] =
    opening?.role === 'user'
      ? [...render(rows.slice(0, -1)), { role: 'user', content: userContent({ text: opening.content, image }) }]
      : render(rows)

  for (const turn of runTurns) {
    messages.push({ role: 'assistant', content: echoedContent(turn.content) })
    if (turn.toolResults.length > 0) {
      messages.push({
        role: 'user',
        content: turn.toolResults.map((tr) => ({
          type: 'tool_result' as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
          is_error: tr.is_error,
        })),
      })
    }
  }
  return messages
}
