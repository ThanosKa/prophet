import type { Message } from '@prophet/shared'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

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
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        {message.outputTokens && (
          <p className="text-xs opacity-70 mt-1">
            {message.outputTokens} tokens
          </p>
        )}
      </div>
    </div>
  )
}
