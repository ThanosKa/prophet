import { config } from '@/lib/config'

type FrontendLogEvent =
  | 'user_message'
  | 'tool_start'
  | 'tool_complete'
  | 'tool_error'
  | 'assistant_stream'
  | 'assistant_final'

export async function logFrontendEvent(
  chatId: string,
  event: FrontendLogEvent,
  text: string
): Promise<void> {
  if (!config.useDevApi) return
  if (!text.trim()) return

  try {
    await fetch(`${config.apiUrl}/api/log/frontend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, event, text }),
    })
  } catch {
    // Never crash the UI for logging
  }
}


