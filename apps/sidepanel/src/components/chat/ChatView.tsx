import { useRef, useEffect } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { EnhancedMessageList, type EnhancedMessageListHandle } from './EnhancedMessageList'
import { EnhancedChatInput } from './EnhancedChatInput'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import { config } from '@/lib/config'
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
  error?: string | null
  errorInfo?: { code?: string; pricingUrl?: string } | null
  onDismissError?: () => void
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
  error,
  errorInfo,
  onDismissError,
}: ChatViewProps) {
  const messageListRef = useRef<EnhancedMessageListHandle>(null)
  const showSuggestions = suggestions && suggestions.length > 0 && messages.length === 0

  useEffect(() => {
    // Auto-scroll when new messages are added
    if (messages.length > 0) {
      messageListRef.current?.scrollToBottom()
    }
  }, [messages.length])

  const handleUpgradeClick = () => {
    const pricingUrl = errorInfo?.pricingUrl || '/pricing'
    const fullUrl = `${config.apiUrl}${pricingUrl}`
    window.open(fullUrl, '_blank')
    onDismissError?.()
  }

  const handleSuggestionClick = (suggestion: string) => {
    messageListRef.current?.scrollToBottom()
    onSend(suggestion)
  }

  const handleSend = (message: string, image?: ImageData) => {
    messageListRef.current?.scrollToBottom()
    onSend(message, image)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <EnhancedMessageList
        ref={messageListRef}
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
      {error && (
        <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-destructive font-medium">{error}</p>
            {errorInfo?.code === 'INSUFFICIENT_BALANCE' && (
              <button
                onClick={handleUpgradeClick}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Upgrade your plan
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {onDismissError && (
            <button
              onClick={onDismissError}
              className="shrink-0 p-1 hover:bg-destructive/10 rounded transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          )}
        </div>
      )}
      <EnhancedChatInput
        onSend={handleSend}
        disabled={disabled}
        isRunning={Boolean(isStreaming)}
        onAbort={onAbort}
        placeholder={inputPlaceholder}
      />
    </div>
  )
}
