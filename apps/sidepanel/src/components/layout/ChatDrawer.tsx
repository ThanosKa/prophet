import { Plus, Trash2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { Chat } from '@prophet/shared'

interface ChatDrawerProps {
  chats: Chat[]
  activeId?: string | null
  onSelectChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onNewChat: () => void
}

export function ChatDrawer({
  chats,
  activeId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
}: ChatDrawerProps) {
  const { drawerOpen, setDrawerOpen } = useUIStore()

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId)
    setDrawerOpen(false)
  }

  const handleNewChat = () => {
    onNewChat()
    setDrawerOpen(false)
  }

  const groupChatsByDate = (chats: Chat[]) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const groups: { label: string; chats: Chat[] }[] = [
      { label: 'Today', chats: [] },
      { label: 'Yesterday', chats: [] },
      { label: 'Previous', chats: [] },
    ]

    chats.forEach((chat) => {
      const chatDate = new Date(chat.updatedAt)
      if (chatDate.toDateString() === today.toDateString()) {
        groups[0].chats.push(chat)
      } else if (chatDate.toDateString() === yesterday.toDateString()) {
        groups[1].chats.push(chat)
      } else {
        groups[2].chats.push(chat)
      }
    })

    return groups.filter((g) => g.chats.length > 0)
  }

  const groupedChats = groupChatsByDate(chats)

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col bg-background border-r border-border">
        <SheetHeader className="p-4 pb-2 shrink-0">
          <SheetTitle className="text-lg font-semibold">Prophet</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-4 shrink-0">
          <Button onClick={handleNewChat} className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <Separator className="shrink-0" />

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-4">
            {chats.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No chats yet
              </p>
            ) : (
              groupedChats.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.chats.map((chat) => (
                      <div
                        key={chat.id}
                        className={cn(
                          'group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200',
                          'hover:bg-[var(--chatbot-accent)]/80 active:scale-[0.98]',
                          activeId === chat.id ? 'bg-[var(--chatbot-accent)] ring-1 ring-border shadow-sm' : 'transparent'
                        )}
                        onClick={() => handleSelectChat(chat.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" title={chat.title}>{chat.title}</p>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 p-1.5 hover:bg-destructive/10 rounded-md transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteChat(chat.id)
                          }}
                          title="Delete chat"
                          aria-label="Delete chat"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
