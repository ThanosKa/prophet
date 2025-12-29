import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useChats } from '@/hooks/useChats'
import { useMessages } from '@/hooks/useMessages'
import { useAgentChat } from '@/hooks/useAgentChat'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { AppShell } from '@/components/layout'
import { WelcomeScreen } from '@/components/chat/WelcomeScreen'
import { ChatView } from '@/components/chat/ChatView'
import { SignInButton } from '@/components/auth/SignInButton'
import { Skeleton } from '@/components/ui/skeleton'

interface ImageData {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export default function App() {
  const queryClient = useQueryClient()
  const { isSignedIn, user } = useAuth()
  const { chats, isLoading: chatsLoading, createChatAsync, deleteChat } = useChats()
  const { activeChatId, setActiveChatId, isStreaming, messages: messagesByChat } = useChatStore()
  const { resetContextTokens, theme } = useUIStore()
  const { isLoading: messagesLoading } = useMessages(activeChatId)
  const { sendMessage, abort, currentToolCall } = useAgentChat()

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(theme)
  }, [theme])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ['user'] })
        if (isSignedIn) {
          queryClient.invalidateQueries({ queryKey: ['chats'] })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isSignedIn, queryClient])

  useEffect(() => {
    if (activeChatId) {
      resetContextTokens()
    }
  }, [activeChatId, resetContextTokens])

  const handleNewChat = async () => {
    const chat = await createChatAsync(`New Chat ${new Date().toLocaleTimeString()}`)
    if (chat) {
      setActiveChatId(chat.id)
    }
  }

  const handleSelectChat = (chatId: string) => {
    if (isStreaming && activeChatId !== chatId) {
      abort()
    }
    setActiveChatId(chatId)
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId)
    if (activeChatId === chatId) {
      setActiveChatId(null)
    }
  }

  const handleSendMessage = async (content: string, image?: ImageData) => {
    if (!activeChatId) {
      const chat = await createChatAsync(content.slice(0, 50) || 'Image')
      if (chat) {
        setActiveChatId(chat.id)
        await sendMessage(chat.id, content, image)
      }
    } else {
      await sendMessage(activeChatId, content, image)
    }
  }

  if (!isSignedIn) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-6 p-6 bg-muted">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Prophet</h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Your AI-powered browser assistant
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <SignInButton />
          <p className="text-xs text-muted-foreground text-center">
            Secure authentication powered by Clerk
          </p>
        </div>
      </div>
    )
  }

  if (chatsLoading) {
    return (
      <div className="h-screen w-screen flex flex-col bg-muted">
        <div className="h-12 border-b flex items-center justify-between px-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-2">
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-4 w-24 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  const activeChat = chats.find((c) => c.id === activeChatId)
  const activeMessages = activeChatId ? (messagesByChat[activeChatId] ?? []) : []

  return (
    <AppShell
      chatTitle={activeChat?.title}
      chats={chats}
      activeChatId={activeChatId}
      onSelectChat={handleSelectChat}
      onDeleteChat={handleDeleteChat}
      onNewChat={handleNewChat}
    >
      {activeChatId ? (
        <ChatView
          messages={activeMessages}
          isLoading={messagesLoading}
          isStreaming={isStreaming}
          currentToolCall={currentToolCall}
          onSend={handleSendMessage}
          disabled={isStreaming}
          inputPlaceholder={
            user?.creditsRemaining === 0
              ? 'Upgrade to continue chatting'
              : 'Ask anything...'
          }
        />
      ) : (
        <WelcomeScreen
          onSend={handleSendMessage}
          disabled={isStreaming}
        />
      )}
    </AppShell>
  )
}
