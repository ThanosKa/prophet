import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './ChatMessage'
import { ToolCallCard } from './ToolCallCard'
import type { Message, ToolCall } from '@prophet/shared'

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
  currentToolCall?: ToolCall | null
  streamingContent?: string
}

export function MessageList({
  messages,
  isLoading,
  currentToolCall,
  streamingContent,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingContent, currentToolCall])

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="space-y-4 py-4">
        {messages.length === 0 && !isLoading && (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No messages yet. Start a conversation!</p>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {(isLoading || streamingContent || currentToolCall) && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground px-3 py-2 rounded-lg max-w-xs">
              {streamingContent && (
                <p className="text-sm whitespace-pre-wrap break-words">{streamingContent}</p>
              )}
              {currentToolCall && (
                <div className="mt-2">
                  <ToolCallCard toolCall={currentToolCall} isExecuting />
                </div>
              )}
              {isLoading && !streamingContent && !currentToolCall && (
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}
