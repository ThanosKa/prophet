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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function App() {
  const { isSignedIn, user, clerkUser } = useAuth()
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
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-6 p-6 bg-background">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-3xl font-bold text-foreground">Prophet</h1>
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            Your AI-powered assistant right in your browser
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <SignInButton />

          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Secure authentication powered by Clerk
            </p>
          </div>
        </div>
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
          <div className="flex-1 flex items-center justify-center p-6">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Welcome back, {clerkUser?.firstName || 'User'}</CardTitle>
                <CardDescription>Select a chat to continue or create a new one</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-lg bg-muted p-4">
                  <h4 className="font-semibold text-sm text-muted-foreground">Your Plan</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-sm capitalize">{user?.tier || 'Free'} Tier</span>
                    <span className="font-medium text-sm">{user?.creditsRemaining || 0} credits</span>
                  </div>
                </div>
                <Button onClick={handleNewChat} className="w-full">
                  Start New Chat
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
