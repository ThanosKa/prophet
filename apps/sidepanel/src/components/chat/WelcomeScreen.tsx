import { EnhancedChatInput, type OnSend } from './EnhancedChatInput'
import { ChatBanner, type ChatBannerProps } from './ChatBanner'

interface WelcomeScreenProps extends ChatBannerProps {
  onSend: OnSend
  disabled?: boolean
}

export function WelcomeScreen({ onSend, disabled, ...bannerProps }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Prophet
          </h1>
        </div>
      </div>

      <ChatBanner {...bannerProps} />
      <EnhancedChatInput onSend={onSend} disabled={disabled} />
    </div>
  )
}
