import { useEffect, useMemo } from 'react'
import { useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useChatStore } from '@/store/chatStore'
import { apiClient } from '@/lib/api'

export function useChats() {
  const queryClient = useQueryClient()
  const { setChats, addChat, removeChat } = useChatStore()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['chats'],
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.getChats(15, pageParam)
      if (response.data) {
        return response.data
      }
      return { chats: [], nextCursor: null, hasMore: false }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor?.beforeUpdatedAt,
    staleTime: 1000 * 60 * 5,  // 5 minutes - consistent with other queries
  })

  // Flatten all pages into single list
  const chats = useMemo(() => data?.pages.flatMap(page => page.chats) ?? [], [data?.pages])

  // Hydrate store on initial load
  useEffect(() => {
    if (chats.length > 0) {
      setChats(chats)
    }
  }, [chats, setChats])

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
      removeChat(chatId)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] })
    },
  })

  const createChatAsync = async (title: string) => {
    const response = await createMutation.mutateAsync(title)
    return response.data
  }

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
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
    deletingChatId: deleteMutation.variables,
    loadMore,
    hasMore: hasNextPage ?? false,
    isLoadingMore: isFetchingNextPage,
  }
}
