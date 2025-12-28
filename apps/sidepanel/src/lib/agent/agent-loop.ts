import { executeTool } from './tools'
import { DEFAULT_AGENT_MODEL } from '@prophet/shared'
import type {
  AgentStreamEvent,
  AgentModel,
  ToolUse,
  ToolResult,
  ContentBlock,
  ToolCall,
  ScreenshotResult,
} from '@prophet/shared'

export interface AgentLoopEvent {
  type: 'content_delta' | 'tool_use_start' | 'tool_use_complete' | 'done' | 'error'
  content?: string
  toolCall?: ToolCall
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

interface StreamAgentChatOptions {
  chatId: string
  model: AgentModel
  userMessage?: string
  toolResults?: ToolResult[]
  previousContent?: ContentBlock[]
}

async function* streamAgentChat(
  baseUrl: string,
  options: StreamAgentChatOptions
): AsyncGenerator<AgentStreamEvent> {
  const tokenResponse = await chrome.runtime.sendMessage({
    type: 'GET_AUTH_TOKEN',
  })
  const token = tokenResponse?.token

  const url = new URL('/api/agent/chat', baseUrl)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const body: Record<string, unknown> = {
    chatId: options.chatId,
    model: options.model,
  }

  if (options.userMessage) {
    body.userMessage = options.userMessage
  }

  if (options.toolResults) {
    body.toolResults = options.toolResults
  }

  if (options.previousContent) {
    body.previousContent = options.previousContent
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    yield {
      type: 'error',
      error: errorData.error || `HTTP ${response.status}`,
    }
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    yield {
      type: 'error',
      error: 'No response body',
    }
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)) as AgentStreamEvent
            yield data
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    if (buffer.startsWith('data: ')) {
      try {
        const data = JSON.parse(buffer.slice(6)) as AgentStreamEvent
        yield data
      } catch {
        // Skip malformed JSON
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function* runAgentLoop(
  baseUrl: string,
  chatId: string,
  userMessage: string,
  model: AgentModel = DEFAULT_AGENT_MODEL
): AsyncGenerator<AgentLoopEvent> {
  let previousContent: ContentBlock[] = []
  let currentTextContent = ''
  let pendingToolUse: ToolUse | null = null
  let isFirstRequest = true

  while (true) {
    const streamOptions: StreamAgentChatOptions = {
      chatId,
      model,
    }

    if (isFirstRequest) {
      streamOptions.userMessage = userMessage
      isFirstRequest = false
    } else {
      streamOptions.previousContent = previousContent
    }

    let hasToolUse = false
    const toolResults: ToolResult[] = []
    currentTextContent = ''
    const assistantContent: ContentBlock[] = []

    for await (const event of streamAgentChat(baseUrl, streamOptions)) {
      switch (event.type) {
        case 'content_delta':
          if (event.content) {
            currentTextContent += event.content
            yield {
              type: 'content_delta',
              content: event.content,
            }
          }
          break

        case 'tool_use':
          if (event.toolUse) {
            hasToolUse = true
            pendingToolUse = event.toolUse

            if (currentTextContent) {
              assistantContent.push({
                type: 'text',
                text: currentTextContent,
              })
              currentTextContent = ''
            }

            assistantContent.push(event.toolUse)

            yield {
              type: 'tool_use_start',
              toolCall: {
                id: event.toolUse.id,
                name: event.toolUse.name,
                input: event.toolUse.input,
              },
            }
          }
          break

        case 'tool_use_complete':
          if (pendingToolUse) {
            const toolResult = await executeTool(
              pendingToolUse.name,
              pendingToolUse.input
            )

            let resultContent: string
            if (pendingToolUse.name === 'take_screenshot' && toolResult.success) {
              const screenshot = toolResult.data as ScreenshotResult
              resultContent = `[Screenshot captured: ${screenshot.mimeType}, base64 data available]`
            } else if (toolResult.success) {
              resultContent =
                typeof toolResult.data === 'string'
                  ? toolResult.data
                  : JSON.stringify(toolResult.data)
            } else {
              resultContent = toolResult.error || 'Tool execution failed'
            }

            const result: ToolResult = {
              type: 'tool_result',
              tool_use_id: pendingToolUse.id,
              content: resultContent,
              is_error: !toolResult.success,
            }

            toolResults.push(result)

            yield {
              type: 'tool_use_complete',
              toolCall: {
                id: pendingToolUse.id,
                name: pendingToolUse.name,
                input: pendingToolUse.input,
                result: resultContent,
                isError: !toolResult.success,
                durationMs: toolResult.durationMs,
              },
            }

            pendingToolUse = null
          }
          break

        case 'done':
          if (!hasToolUse) {
            yield {
              type: 'done',
              usage: event.usage,
            }
            return
          }
          break

        case 'error':
          yield {
            type: 'error',
            error: event.error,
          }
          return
      }
    }

    if (!hasToolUse) {
      yield { type: 'done' }
      return
    }

    if (currentTextContent) {
      assistantContent.push({
        type: 'text',
        text: currentTextContent,
      })
    }

    previousContent = assistantContent
    streamOptions.toolResults = toolResults
    streamOptions.previousContent = previousContent
  }
}
