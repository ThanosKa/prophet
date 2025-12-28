import { EnhancedChatInput } from './EnhancedChatInput'

interface ImageData {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

interface WelcomeScreenProps {
  onSend: (message: string, image?: ImageData) => void
  disabled?: boolean
}

export function WelcomeScreen({ onSend, disabled }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Prophet
          </h1>
        </div>
      </div>

      <EnhancedChatInput onSend={onSend} disabled={disabled} />
    </div>
  )
}
