import type { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { parseStoredToolCalls, type AgentChatRequest, type AgentTurn, type ImageData } from '@prophet/shared'
import type { HistoryRow } from '@/lib/agent/run-record'

const ACTION_INPUT_MAX_CHARS = 300
const RECORD_TEXT_MAX_CHARS = 8000

/** Cuts by code point, so a surrogate pair is never split. */
function capText(text: string): string {
  const chars = Array.from(text)
  if (chars.length <= RECORD_TEXT_MAX_CHARS) return text
  const keep = RECORD_TEXT_MAX_CHARS / 2
  const head = chars.slice(0, keep).join('')
  const tail = chars.slice(-keep).join('')
  return `${head}\n[… ${chars.length - RECORD_TEXT_MAX_CHARS} characters left out …]\n${tail}`
}

function capActionInput(input: Record<string, unknown>): string {
  const chars = Array.from(JSON.stringify(input))
  if (chars.length <= ACTION_INPUT_MAX_CHARS) return chars.join('')
  return `${chars.slice(0, ACTION_INPUT_MAX_CHARS).join('')}…`
}

/**
 * An earlier Run's record as Claude reads it: its text plus a compact list of the
 * actions it took, which is how "continue" remembers them. Must stay deterministic:
 * every Turn of the next Run sends the same bytes for it, or the prompt cache misses.
 */
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

function userContent(text: string, image: ImageData | undefined): MessageParam['content'] {
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
 * the opening message at the end of the stored history.
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
  const messages: MessageParam[] = history.map((row) => ({
    role: row.role,
    content: renderStoredMessage(row),
  }))

  if (userMessage) {
    messages.push({ role: 'user', content: userContent(userMessage, image) })
    return messages
  }

  if (messages.at(-1)?.role === 'assistant') messages.pop()
  // Only the opening message's text is stored; the extension resends the run's image
  // so the opening message matches the first turn's.
  const opening = messages.at(-1)
  if (image && opening?.role === 'user' && typeof opening.content === 'string') {
    opening.content = userContent(opening.content, image)
  }

  for (const turn of runTurns) {
    messages.push({ role: 'assistant', content: turn.content as ContentBlockParam[] })
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
