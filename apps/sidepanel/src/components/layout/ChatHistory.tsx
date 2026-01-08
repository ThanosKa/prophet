
import { Trash2, Plus, Loader2 } from 'lucide-react'
import { useRef, useEffect, useMemo } from 'react'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import type { Chat } from '@prophet/shared'

interface ChatHistoryProps {
    chats: Chat[]
    onSelectChat: (chatId: string) => void
    onDeleteChat: (chatId: string) => void
    onNewChat: () => void
    activeChatId?: string | null
    deletingChatId?: string
    hasMore?: boolean
    isLoadingMore?: boolean
    onLoadMore?: () => void
}

export function ChatHistory({
    chats,
    onSelectChat,
    onDeleteChat,
    onNewChat,
    activeChatId,
    deletingChatId,
    hasMore,
    isLoadingMore,
    onLoadMore,
}: ChatHistoryProps) {
    const { drawerOpen, setDrawerOpen } = useUIStore()
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!hasMore || isLoadingMore || !onLoadMore) return

        const scrollArea = scrollAreaRef.current
        if (!scrollArea) return

        // Targeted fix for Radix ScrollArea: use the viewport as the root
        const viewport = scrollArea.querySelector('[data-radix-scroll-area-viewport]')

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMore()
                }
            },
            {
                root: viewport, // Critical: observe within this scroll container
                threshold: 0.1
            }
        )

        if (sentinelRef.current) {
            observer.observe(sentinelRef.current)
        }

        return () => observer.disconnect()
    }, [hasMore, isLoadingMore, onLoadMore, chats])

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
            { label: 'Older', chats: [] },
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
            } else {
                groups[4].chats.push(chat)
            }
        })

        return groups.filter((g) => g.chats.length > 0)
    }

    const realChats = chats.filter(chat => !chat.id.startsWith('draft-'))
    const groupedChats = useMemo(() => groupChatsByDate(realChats), [realChats])

    return (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetContent side="left" className="w-72 max-w-full p-0 flex flex-col bg-background border-r border-border">
                <SheetHeader className="p-4 pb-2 shrink-0">
                    <SheetTitle className="text-lg font-semibold flex items-center gap-2">
                        <img src="/logo.svg" alt="Prophet" className="h-6 w-6" />
                        Prophet
                    </SheetTitle>
                </SheetHeader>

                <div className="px-4 pb-4 shrink-0">
                    <Button
                        onClick={handleNew}
                        className="w-full"
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        New Chat
                    </Button>
                </div>

                <Separator className="shrink-0" />

                <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
                    <div className="pb-4 flex flex-col gap-6 min-w-0">
                        {chats.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground text-sm">
                                No chat history found.
                            </div>
                        ) : (
                            <>
                                {groupedChats.map(group => (
                                    <div key={group.label} className="flex flex-col gap-2 min-w-0">
                                        <h4 className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider px-2">
                                            {group.label}
                                        </h4>
                                        <div className="flex flex-col gap-[2px] min-w-0">
                                            {group.chats.map(chat => {
                                                const isDeleting = deletingChatId === chat.id
                                                return (
                                                    <div
                                                        key={chat.id}
                                                        onClick={() => handleSelect(chat.id)}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2.5 rounded-md text-sm cursor-pointer transition-colors min-w-0 overflow-hidden",
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
                                                                "shrink-0 flex-none p-1.5 rounded-md transition-all outline-none",
                                                                "text-muted-foreground/60",
                                                                !isDeleting && "hover:text-destructive hover:bg-destructive/10",
                                                                isDeleting && "pointer-events-none"
                                                            )}
                                                            title="Delete chat"
                                                        >
                                                            {isDeleting ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="w-4 h-4" />
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {isLoadingMore && (
                                    <div className="flex items-center justify-center py-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                                {!isLoadingMore && !hasMore && chats.length > 0 && (
                                    <div className="text-center py-4 text-muted-foreground/50 text-xs">
                                        End of conversations
                                    </div>
                                )}
                                <div ref={sentinelRef} className="h-1" />
                            </>
                        )}
                    </div>
                </ScrollArea>

            </SheetContent>
        </Sheet>
    )
}
