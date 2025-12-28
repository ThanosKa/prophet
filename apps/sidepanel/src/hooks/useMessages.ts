import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '@/store/chatStore'
import { apiClient } from '@/lib/api'

/**
 * Hook for fetching messages for a chat
 */
export function useMessages(chatId: string | null) {
  const queryClient = useQueryClient()
  const { setMessages } = useChatStore()

  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return []
      const response = await apiClient.getMessages(chatId)
      if (response.data) {
        // Hydrate chat history, but avoid overwriting locally-added / streaming messages.
        // We only set the store when it doesn't have messages for this chat yet.
        const existing = useChatStore.getState().messages[chatId]
        if (!existing || existing.length === 0) {
          setMessages(chatId, response.data)
        }
        return response.data
      }
      return []
    },
    enabled: !!chatId,
    staleTime: 0, // Always fetch fresh messages
  })

  const refetch = () => {
    if (chatId) {
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
    }
  }

  return {
    messages,
    isLoading,
    error,
    refetch,
  }
}
