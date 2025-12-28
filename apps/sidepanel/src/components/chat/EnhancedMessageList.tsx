import { useRef, useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ScrollToBottomButton } from '@/components/ui/scroll-to-bottom'
import { TypingIndicator } from '@/components/ui/typing-indicator'
import { EnhancedChatMessage } from './EnhancedChatMessage'
import type { Message, ToolCall } from '@prophet/shared'

interface AgentMessage extends Message {
  toolCalls?: ToolCall[]
}

interface EnhancedMessageListProps {
  messages: AgentMessage[]
  isLoading?: boolean
  isStreaming?: boolean
  streamingContent?: string
  currentToolCall?: ToolCall | null
}

export function EnhancedMessageList({
  messages,
  isLoading,
  isStreaming,
  streamingContent,
  currentToolCall,
}: EnhancedMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [userScrolled, setUserScrolled] = useState(false)

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      setUserScrolled(false)
    }
  }

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
      if (!isNearBottom) {
        setUserScrolled(true)
      }
    }
  }

  useEffect(() => {
    if (!userScrolled) {
      scrollToBottom()
    }
  }, [messages, streamingContent, userScrolled])

  useEffect(() => {
    if (isStreaming && !userScrolled) {
      scrollToBottom()
    }
  }, [isStreaming, userScrolled])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        Start a conversation
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <ScrollArea
        className="h-full"
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="divide-y divide-border/50">
          {messages.map((message, index) => {
            const isLast = index === messages.length - 1
            const isLastAssistant = isLast && message.role === 'assistant'

            return (
              <EnhancedChatMessage
                key={message.id}
                message={message}
                isStreaming={isLastAssistant && isStreaming}
                streamingContent={isLastAssistant ? streamingContent : undefined}
                currentToolCall={isLastAssistant ? currentToolCall : undefined}
              />
            )
          })}
        </div>

        {isLoading && !isStreaming && (
          <div className="flex items-center gap-3 py-4 px-4 bg-muted/30">
            <TypingIndicator />
          </div>
        )}
      </ScrollArea>

      <ScrollToBottomButton
        show={showScrollButton}
        onClick={scrollToBottom}
      />
    </div>
  )
}
