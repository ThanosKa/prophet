import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Chat } from "@prophet/shared";
import { cn } from "@/lib/utils";

interface ChatListProps {
  chats: Chat[];
  activeId?: string | null;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function ChatList({
  chats,
  activeId,
  onSelectChat,
  onDeleteChat,
  onNewChat,
}: ChatListProps) {
  return (
    <div className="flex flex-col h-full w-64 border-r">
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full" size="sm">
          New Chat
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {chats.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No chats yet. Create one to start!
            </p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className={cn(
                  "group relative flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors",
                  activeId === chat.id && "bg-accent"
                )}
                onClick={() => onSelectChat(chat.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(chat.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  className="cursor-pointer opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive rounded transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
