import type { ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages'
import type { AgentChatRequest, AgentTurn, ImageData } from '@prophet/shared'

type StoredMessage = { role: string; content: string }

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
 * The run's opening user message is saved after its first turn, so continuation
 * turns find it at the end of the stored history.
 */
export function buildAgentMessages({
  history,
  userMessage,
  image,
  runTurns,
}: {
  history: StoredMessage[]
  userMessage: string | undefined
  image: ImageData | undefined
  runTurns: AgentTurn[]
}): MessageParam[] {
  const messages: MessageParam[] = history.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
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
