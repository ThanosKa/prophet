import { ArrowUp } from 'lucide-react'
import { ModelSelector } from './ModelSelector'
import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextCacheUsage,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from '@/components/ai-elements/context'
import { useUIStore } from '@/store/uiStore'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input'

interface ImageData {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

interface EnhancedChatInputProps {
  onSend: (message: string, image?: ImageData) => void
  disabled?: boolean
  placeholder?: string
}

export function EnhancedChatInput({
  onSend,
  disabled,
  placeholder = 'Ask anything...',
}: EnhancedChatInputProps) {
  const {
    contextTokens,
    contextInputTokens,
    contextOutputTokens,
    contextReasoningTokens,
    contextCachedInputTokens,
    maxContextTokens,
    selectedModel,
  } = useUIStore()

  const fileToImageData = async (file: File): Promise<ImageData> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
    const base64 = dataUrl.split(',')[1] ?? ''
    return {
      base64,
      mediaType: file.type as ImageData['mediaType'],
    }
  }

  const handleSubmit = async (message: PromptInputMessage) => {
    if (disabled) return
    const file = message.files?.[0]
    const imageForApi = file ? await fileToImageData(file) : undefined
    onSend(message.text ?? '', imageForApi)
  }

  return (
    <div className="p-3 bg-background">
      <PromptInput onSubmit={handleSubmit} disabled={disabled} globalDrop multiple={false}>
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
        </PromptInputHeader>

        <PromptInputBody>
          <PromptInputTextarea placeholder={placeholder} />
        </PromptInputBody>

        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <ModelSelector disabled={disabled} compact />
            <Context
              maxTokens={maxContextTokens}
              modelId={selectedModel}
              usage={{
                inputTokens: contextInputTokens,
                outputTokens: contextOutputTokens,
                totalTokens: contextTokens,
                cachedInputTokens: contextCachedInputTokens,
                reasoningTokens: contextReasoningTokens,
              }}
              usedTokens={contextTokens}
            >
              <ContextTrigger />
              <ContextContent>
                <ContextContentHeader />
                <ContextContentBody>
                  <ContextInputUsage />
                  <ContextOutputUsage />
                  <ContextReasoningUsage />
                  <ContextCacheUsage />
                </ContextContentBody>
                <ContextContentFooter />
              </ContextContent>
            </Context>
          </PromptInputTools>

          <PromptInputSubmit disabled={disabled}>
            <ArrowUp className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}
