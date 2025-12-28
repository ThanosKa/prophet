import { useState, useCallback, useRef } from 'react'
import { useChatStore } from '@/store/chatStore'
import { runAgentLoop } from '@/lib/agent'
import { config } from '@/lib/config'
import type { Message, ToolCall } from '@prophet/shared'

export interface AgentMessage extends Message {
  toolCalls?: ToolCall[]
  streamingContent?: string
}

export function useAgentChat() {
  const { addMessage, setStreaming } = useChatStore()
  const [error, setError] = useState<string | null>(null)
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const abortRef = useRef<boolean>(false)

  const sendMessage = useCallback(
    async (chatId: string, content: string) => {
      try {
        setError(null)
        setStreaming(true)
        setStreamingContent('')
        setCurrentToolCall(null)
        abortRef.current = false

        const userMessage: AgentMessage = {
          id: crypto.randomUUID(),
          chatId,
          role: 'user',
          content,
          createdAt: new Date(),
        }
        addMessage(chatId, userMessage)

        let fullContent = ''
        const toolCalls: ToolCall[] = []

        for await (const event of runAgentLoop(config.apiUrl, chatId, content)) {
          if (abortRef.current) break

          switch (event.type) {
            case 'content_delta':
              if (event.content) {
                fullContent += event.content
                setStreamingContent(fullContent)
              }
              break

            case 'tool_use_start':
              if (event.toolCall) {
                setCurrentToolCall(event.toolCall)
              }
              break

            case 'tool_use_complete':
              if (event.toolCall) {
                toolCalls.push(event.toolCall)
                setCurrentToolCall(null)
              }
              break

            case 'done': {
              const assistantMessage: AgentMessage = {
                id: crypto.randomUUID(),
                chatId,
                role: 'assistant',
                content: fullContent,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                inputTokens: event.usage?.inputTokens,
                outputTokens: event.usage?.outputTokens,
                createdAt: new Date(),
              }
              addMessage(chatId, assistantMessage)
              setStreamingContent('')
              break
            }

            case 'error':
              setError(event.error || 'Agent execution failed')
              break
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Agent error')
      } finally {
        setStreaming(false)
        setCurrentToolCall(null)
      }
    },
    [addMessage, setStreaming]
  )

  const abort = useCallback(() => {
    abortRef.current = true
  }, [])

  return {
    sendMessage,
    abort,
    error,
    setError,
    currentToolCall,
    streamingContent,
  }
}
