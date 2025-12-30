import type { ReactNode } from 'react'
import { Header } from './Header'
import { ChatDrawer } from './ChatDrawer'
import type { Chat } from '@prophet/shared'

interface AppShellProps {
  children: ReactNode
  chatTitle?: string
  chats: Chat[]
  activeChatId?: string | null
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onNewChat: () => void
}

export function AppShell({
  children,
  chatTitle,
  chats,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
}: AppShellProps) {
  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--chatbot-bg)]">
      <Header title={chatTitle} className="bg-[var(--chatbot-muted)]/95" />

      <ChatDrawer
        chats={chats}
        activeId={activeChatId}
        onSelectChat={onSelectChat}
        onDeleteChat={onDeleteChat}
        onNewChat={onNewChat}
      />

      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
