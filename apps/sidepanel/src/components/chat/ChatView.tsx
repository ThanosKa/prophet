import { EnhancedMessageList } from './EnhancedMessageList'
import { EnhancedChatInput } from './EnhancedChatInput'
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
  disabled?: boolean
  inputPlaceholder?: string
}

export function ChatView({
  messages,
  isLoading,
  isStreaming,
  currentToolCall,
  onSend,
  disabled,
  inputPlaceholder,
}: ChatViewProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <EnhancedMessageList
        messages={messages}
        isLoading={isLoading}
        isStreaming={isStreaming}
        currentToolCall={currentToolCall}
      />
      <EnhancedChatInput
        onSend={onSend}
        disabled={disabled || isStreaming}
        placeholder={inputPlaceholder}
      />
    </div>
  )
}
