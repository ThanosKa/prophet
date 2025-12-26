import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useChats } from '@/hooks/useChats'
import { useMessages } from '@/hooks/useMessages'
import { useStreamChat } from '@/hooks/useStreamChat'
import { useChatStore } from '@/store/chatStore'
import { ChatList } from '@/components/chat/ChatList'
import { MessageList } from '@/components/chat/MessageList'
import { ChatInput } from '@/components/chat/ChatInput'
import { SignInButton } from '@/components/auth/SignInButton'

export default function App() {
  const { isSignedIn, user } = useAuth()
  const { chats, isLoading: chatsLoading, createChat, deleteChat } = useChats()
  const { activeChatId, setActiveChatId, isStreaming } = useChatStore()
  const { messages } = useMessages(activeChatId)
  const { stream } = useStreamChat()

  // Auto-select first chat if none is selected
  useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      setActiveChatId(chats[0].id)
    }
  }, [chats, activeChatId, setActiveChatId])

  const handleNewChat = () => {
    createChat(`New Chat ${new Date().toLocaleTimeString()}`)
  }

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId)
  }

  const handleDeleteChat = (chatId: string) => {
    deleteChat(chatId)
    if (activeChatId === chatId) {
      setActiveChatId(null)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!activeChatId) return
    await stream(activeChatId, content)
  }

  // Show sign-in if not authenticated
  if (!isSignedIn) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-2xl font-bold">Prophet</h1>
        <p className="text-muted-foreground text-center">
          Your AI-powered assistant right in your browser
        </p>
        <SignInButton />
      </div>
    )
  }

  // Show loading state
  if (chatsLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mb-2">Loading chats...</div>
          <div className="text-sm text-muted-foreground">{user?.tier} tier</div>
        </div>
      </div>
    )
  }

  // Show main chat interface
  return (
    <div className="flex h-screen w-screen bg-background">
      {/* Sidebar */}
      <ChatList
        chats={chats}
        activeId={activeChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onNewChat={handleNewChat}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeChatId ? (
          <>
            <MessageList messages={messages} isLoading={isStreaming} />
            <ChatInput
              onSend={handleSendMessage}
              disabled={isStreaming}
              placeholder={
                user?.creditsRemaining === 0
                  ? 'Upgrade to continue chatting'
                  : 'Type your message...'
              }
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="mb-4">No chat selected</p>
              <p className="text-sm">{user?.tier} tier</p>
              <p className="text-sm">{user?.creditsRemaining} credits remaining</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
