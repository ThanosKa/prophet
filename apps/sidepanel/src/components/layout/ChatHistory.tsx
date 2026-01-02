
import { Trash2, MessageSquare, Plus } from 'lucide-react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import type { Chat } from '@prophet/shared'

interface ChatHistoryProps {
    chats: Chat[]
    onSelectChat: (chatId: string) => void
    onDeleteChat: (chatId: string) => void
    onNewChat: () => void
    activeChatId?: string | null
}

export function ChatHistory({
    chats,
    onSelectChat,
    onDeleteChat,
    onNewChat,
    activeChatId
}: ChatHistoryProps) {
    const { drawerOpen, setDrawerOpen } = useUIStore()

    const handleSelect = (id: string) => {
        onSelectChat(id)
        setDrawerOpen(false)
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        onDeleteChat(id)
    }

    const handleNew = () => {
        onNewChat()
        setDrawerOpen(false)
    }

    const groupChatsByDate = (chats: Chat[]) => {
        const today = new Date()
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)
        const sevenDaysAgo = new Date(today)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const thirtyDaysAgo = new Date(today)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const groups: { label: string; chats: Chat[] }[] = [
            { label: 'Today', chats: [] },
            { label: 'Yesterday', chats: [] },
            { label: 'Previous 7 Days', chats: [] },
            { label: 'Previous 30 Days', chats: [] },
        ]

        chats.forEach((chat) => {
            const chatDate = new Date(chat.updatedAt)
            if (chatDate.toDateString() === today.toDateString()) {
                groups[0].chats.push(chat)
            } else if (chatDate.toDateString() === yesterday.toDateString()) {
                groups[1].chats.push(chat)
            } else if (chatDate >= sevenDaysAgo) {
                groups[2].chats.push(chat)
            } else if (chatDate >= thirtyDaysAgo) {
                groups[3].chats.push(chat)
            }
        })

        return groups.filter((g) => g.chats.length > 0)
    }

    const groupedChats = groupChatsByDate(chats)

    return (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 flex flex-col gap-0 bg-background border-r">
                <SheetHeader className="p-4 bg-muted/30 border-b">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-sm font-semibold flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            History
                        </SheetTitle>
                        {/* Close button is automatically added by SheetContent usually, but we can customize header */}
                    </div>
                </SheetHeader>

                <div className="p-4 pb-2">
                    <Button
                        onClick={handleNew}
                        className="w-full justify-start gap-2 h-10 shadow-sm"
                        variant="outline"
                    >
                        <Plus className="w-4 h-4" />
                        New Chat
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-4">
                    <div className="pb-4 flex flex-col gap-6 min-w-0">
                        {chats.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                No chat history found.
                            </div>
                        ) : (
                            groupedChats.map(group => (
                                <div key={group.label} className="flex flex-col gap-2 min-w-0">
                                    <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
                                        {group.label}
                                    </h4>
                                    <div className="flex flex-col gap-[2px] min-w-0">
                                        {group.chats.map(chat => (
                                            <div
                                                key={chat.id}
                                                onClick={() => handleSelect(chat.id)}
                                                className={cn(
                                                    "group flex items-center gap-2 p-2.5 rounded-md text-sm cursor-pointer transition-colors min-w-0 overflow-hidden",
                                                    "hover:bg-accent hover:text-accent-foreground",
                                                    activeChatId === chat.id ? "bg-accent font-medium text-accent-foreground" : "text-foreground/80"
                                                )}
                                            >
                                                <span className="truncate flex-1 min-w-0 overflow-hidden">
                                                    {chat.title}
                                                </span>

                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => handleDelete(e, chat.id)}
                                                    className={cn(
                                                        "shrink-0 flex-none p-1.5 rounded-md transition-all",
                                                        "text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10",
                                                        "focus:ring-2 focus:ring-ring focus:outline-none"
                                                    )}
                                                    title="Delete chat"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t bg-muted/10 mt-auto">
                    <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-card border shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            PR
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-medium">Prophet User</span>
                            <span className="text-[10px] text-muted-foreground">Pro Plan</span>
                        </div>
                    </div>
                </div>

            </SheetContent>
        </Sheet>
    )
}
