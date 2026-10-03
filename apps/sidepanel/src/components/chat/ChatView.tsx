import { useRef, useEffect } from 'react'
import { EnhancedMessageList, type EnhancedMessageListHandle } from './EnhancedMessageList'
import { EnhancedChatInput, type OnSend } from './EnhancedChatInput'
import { ChatBanner, type ChatBannerProps } from './ChatBanner'
import { ReviewPrompt } from './ReviewPrompt'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import type { Message, ToolCall } from '@prophet/shared'

interface AgentMessage extends Message {
  toolCalls?: ToolCall[]
}

interface ChatViewProps extends ChatBannerProps {
  messages: AgentMessage[]
  isLoading?: boolean
  isStreaming?: boolean
  currentToolCall?: ToolCall | null
  onSend: OnSend
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
  error,
  errorInfo,
  retryAfter,
  remaining,
  notice,
  onDismissError,
  onDismissNotice,
}: ChatViewProps) {
  const messageListRef = useRef<EnhancedMessageListHandle>(null)
  const showSuggestions = suggestions && suggestions.length > 0 && messages.length === 0
  const prevMessagesLength = useRef(messages.length)

  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      messageListRef.current?.scrollToBottom()
    }
    prevMessagesLength.current = messages.length
  }, [messages.length])

  const handleSuggestionClick = (suggestion: string) => {
    void onSend(suggestion)
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
      <ChatBanner
        error={error}
        errorInfo={errorInfo}
        retryAfter={retryAfter}
        remaining={remaining}
        notice={notice}
        onDismissError={onDismissError}
        onDismissNotice={onDismissNotice}
      />
      <ReviewPrompt isRunning={Boolean(isStreaming)} />
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
