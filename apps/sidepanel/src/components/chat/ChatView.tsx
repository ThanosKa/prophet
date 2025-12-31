import { EnhancedMessageList } from './EnhancedMessageList'
import { EnhancedChatInput } from './EnhancedChatInput'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import type { Message, ToolCall } from '@prophet/shared'

interface AgentMessage extends Message {
  toolCalls?: ToolCall[]
}

interface ImageData {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

interface ChatViewProps {
  messages: AgentMessage[]
  isLoading?: boolean
  isStreaming?: boolean
  currentToolCall?: ToolCall | null
  onSend: (message: string, image?: ImageData) => void
  onAbort?: () => void
  disabled?: boolean
  inputPlaceholder?: string
  suggestions?: string[]
  hasMore?: boolean
  isLoadingOlder?: boolean
  onLoadOlder?: () => void
}

export function ChatView({
  messages,
  isLoading,
  isStreaming,
  currentToolCall,
  onSend,
  onAbort,
  disabled,
  inputPlaceholder,
  suggestions,
  hasMore,
  isLoadingOlder,
  onLoadOlder,
}: ChatViewProps) {
  const showSuggestions = suggestions && suggestions.length > 0 && messages.length === 0

  const handleSuggestionClick = (suggestion: string) => {
    onSend(suggestion)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <EnhancedMessageList
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        currentToolCall={currentToolCall}
        hasMore={hasMore}
        isLoadingOlder={isLoadingOlder}
        onLoadOlder={onLoadOlder}
      />
      {showSuggestions && (
        <div className="px-4 pb-2">
          <Suggestions>
            {suggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                suggestion={suggestion}
                onClick={handleSuggestionClick}
              />
            ))}
          </Suggestions>
        </div>
      )}
      <EnhancedChatInput
        onSend={onSend}
        disabled={disabled}
        isRunning={Boolean(isStreaming)}
        onAbort={onAbort}
        placeholder={inputPlaceholder}
      />
    </div>
  )
}
