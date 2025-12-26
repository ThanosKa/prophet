import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '@/store/chatStore'
import { apiClient } from '@/lib/api'
import type { Chat } from '@prophet/shared'

/**
 * Hook for managing chats
 * Handles fetching, creating, and deleting chats
 */
export function useChats() {
  const queryClient = useQueryClient()
  const { setChats, addChat, removeChat } = useChatStore()

  // Fetch chats
  const { data: chats = [], isLoading, error } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await apiClient.getChats()
      if (response.data) {
        setChats(response.data)
        return response.data
      }
      return []
    },
    staleTime: 1000 * 60,
  })

  // Create chat mutation
  const createMutation = useMutation({
    mutationFn: (title: string) => apiClient.createChat(title),
    onSuccess: (response) => {
      if (response.data) {
        addChat(response.data)
        queryClient.invalidateQueries({ queryKey: ['chats'] })
      }
    },
  })

  // Delete chat mutation
  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => apiClient.deleteChat(chatId),
    onSuccess: (response, chatId) => {
      if (response.data) {
        removeChat(chatId)
        queryClient.invalidateQueries({ queryKey: ['chats'] })
      }
    },
  })

  return {
    chats,
    isLoading,
    error,
    createChat: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteChat: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
