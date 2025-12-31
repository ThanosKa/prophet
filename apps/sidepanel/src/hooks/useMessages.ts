import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useChatStore } from '@/store/chatStore'
import { apiClient } from '@/lib/api'

/**
 * Hook for fetching messages for a chat with pagination support
 */
export function useMessages(chatId: string | null) {
  const { setMessages, prependMessages } = useChatStore()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: async ({ pageParam }) => {
      if (!chatId) return { messages: [], nextCursor: null, hasMore: false }
      const response = await apiClient.getMessages(chatId, 50, pageParam)
      if (response.data) {
        return response.data
      }
      return { messages: [], nextCursor: null, hasMore: false }
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor?.beforeCreatedAt,
    enabled: !!chatId,
    staleTime: 0,
  })

  // Hydrate store with initial page
  useEffect(() => {
    if (data && chatId) {
      const existing = useChatStore.getState().messages[chatId]
      if (!existing || existing.length === 0) {
        const allMessages = data.pages.flatMap(page => page.messages).reverse()
        if (allMessages.length > 0) {
          setMessages(chatId, allMessages)
        }
      }
    }
  }, [data, chatId, setMessages])

  const loadOlder = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().then((result) => {
        if (result.data && chatId) {
          const lastPage = result.data.pages[result.data.pages.length - 1]
          if (lastPage) {
            prependMessages(chatId, lastPage.messages)
          }
        }
      })
    }
  }

  return {
    isLoading,
    error,
    loadOlder,
    hasMore: hasNextPage ?? false,
    isLoadingOlder: isFetchingNextPage,
  }
}
