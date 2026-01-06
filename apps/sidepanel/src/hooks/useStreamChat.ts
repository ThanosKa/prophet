import { useState, useCallback } from 'react'
import { useChatStore } from '@/store/chatStore'
import { apiClient } from '@/lib/api'
import type { Message } from '@prophet/shared'

/**
 * Hook for streaming chat responses
 */
export function useStreamChat() {
  const { addMessage, setStreaming } = useChatStore()
  const [error, setError] = useState<string | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const stream = useCallback(
    async (chatId: string, content: string) => {
      try {
        setError(null)
        setRetryAfter(null)
        setRemaining(null)
        setStreaming(true)

        let fullResponse = ''

        // Stream messages from API
        for await (const event of apiClient.streamChat(chatId, content)) {
          if (event.type === 'token' && event.content) {
            fullResponse += event.content
          } else if (event.type === 'done') {
            // Add assistant message to store when done
            const assistantMessage: Message = {
              id: crypto.randomUUID(),
              chatId,
              role: 'assistant',
              content: fullResponse,
              inputTokens: event.usage?.inputTokens,
              outputTokens: event.usage?.outputTokens,
              createdAt: new Date(),
            }
            addMessage(chatId, assistantMessage)

            // Add user message
            const userMessage: Message = {
              id: crypto.randomUUID(),
              chatId,
              role: 'user',
              content,
              createdAt: new Date(),
            }
            addMessage(chatId, userMessage)
          } else if (event.type === 'error') {
            setError(event.error || 'Streaming failed')
            if (event.retryAfter !== undefined) {
              setRetryAfter(event.retryAfter)
            }
            if (event.remaining !== undefined) {
              setRemaining(event.remaining)
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Streaming error')
      } finally {
        setStreaming(false)
      }
    },
    [addMessage, setStreaming]
  )

  return {
    stream,
    error,
    retryAfter,
    remaining,
    setError,
  }
}
