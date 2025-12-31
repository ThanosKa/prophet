import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '@/store/chatStore'
import { apiClient } from '@/lib/api'
import { Chat } from '@prophet/shared'

export function useChats() {
  const queryClient = useQueryClient()
  const { setChats, addChat, removeChat } = useChatStore()

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

  const createMutation = useMutation({
    mutationFn: (title: string) => apiClient.createChat(title),
    onSuccess: (response) => {
      if (response.data) {
        addChat(response.data)
        queryClient.invalidateQueries({ queryKey: ['chats'] })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (chatId: string) => apiClient.deleteChat(chatId),
    onMutate: async (chatId: string) => {
      await queryClient.cancelQueries({ queryKey: ['chats'] })
      const previousChats = queryClient.getQueryData<Chat[]>(['chats'])
      
      if (previousChats) {
        queryClient.setQueryData(['chats'], previousChats.filter((c) => c.id !== chatId))
      }
      removeChat(chatId)
      
      return { previousChats }
    },
    onError: (_error, _chatId, context) => {
      if (context?.previousChats) {
        queryClient.setQueryData(['chats'], context.previousChats)
        // Re-add to Zustand
        context.previousChats.forEach((chat) => {
          const state = useChatStore.getState()
          if (!state.chats.find((c) => c.id === chat.id)) {
            state.addChat(chat)
          }
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })

  const createChatAsync = async (title: string) => {
    const response = await createMutation.mutateAsync(title)
    return response.data
  }

  return {
    chats,
    isLoading,
    error,
    createChat: createMutation.mutate,
    createChatAsync,
    isCreating: createMutation.isPending,
    deleteChat: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  }
}
