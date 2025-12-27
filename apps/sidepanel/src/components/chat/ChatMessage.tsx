import type { Message, ToolCall } from '@prophet/shared'
import { cn } from '@/lib/utils'
import { ToolCallList } from './ToolCallCard'

interface AgentMessage extends Message {
  toolCalls?: ToolCall[]
}

interface ChatMessageProps {
  message: AgentMessage
  currentToolCall?: ToolCall | null
  streamingContent?: string
}

export function ChatMessage({ message, currentToolCall, streamingContent }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'
  const displayContent = streamingContent || message.content

  return (
    <div className={cn('flex gap-3 mb-4', isAssistant ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-xs px-3 py-2 rounded-lg',
          isAssistant
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary text-primary-foreground'
        )}
      >
        {displayContent && (
          <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
        )}
        {isAssistant && (message.toolCalls || currentToolCall) && (
          <ToolCallList
            toolCalls={message.toolCalls || []}
            currentToolCall={currentToolCall}
          />
        )}
        {message.outputTokens && (
          <p className="text-xs opacity-70 mt-1">
            {message.outputTokens} tokens
          </p>
        )}
      </div>
    </div>
  )
}
