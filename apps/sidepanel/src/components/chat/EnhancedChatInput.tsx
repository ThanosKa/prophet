import { useState, useRef, useEffect } from 'react'
import { Send, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ModelSelector } from './ModelSelector'
import { ContextUsageRing } from '@/components/ui/context-usage-ring'
import { useUIStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

interface LocalImageData {
  base64: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  preview: string
}

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
  const [input, setInput] = useState('')
  const [image, setImage] = useState<LocalImageData | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { contextTokens, maxContextTokens } = useUIStore()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSend = () => {
    if ((input.trim() || image) && !disabled) {
      const imageForApi = image ? { base64: image.base64, mediaType: image.mediaType } : undefined
      onSend(input.trim(), imageForApi)
      setInput('')
      setImage(null)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      const mediaType = file.type as LocalImageData['mediaType']
      setImage({
        base64,
        mediaType,
        preview: reader.result as string,
      })
    }
    reader.readAsDataURL(file)

    e.target.value = ''
  }

  const handleRemoveImage = () => {
    setImage(null)
  }

  const hasContent = input.trim() || image

  return (
    <div className="p-3 bg-background">
      <div
        className={cn(
          'relative flex flex-col',
          'bg-muted/50 rounded-[28px] border border-border/50',
          'focus-within:border-border focus-within:ring-1 focus-within:ring-ring/20',
          'transition-all duration-200'
        )}
      >
        {image && (
          <div className="px-4 pt-3">
            <div className="relative inline-block">
              <img
                src={image.preview}
                alt="Preview"
                className="h-16 w-16 rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'min-h-[44px] max-h-[120px] resize-none',
            'bg-transparent border-0 focus-visible:ring-0',
            'px-4 pt-3 pb-1',
            'placeholder:text-muted-foreground/60'
          )}
        />

        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleFileSelect}
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
              <span className="sr-only">Attach image</span>
            </Button>
            <ModelSelector disabled={disabled} compact />
            <ContextUsageRing
              used={contextTokens}
              max={maxContextTokens}
              size="sm"
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 rounded-full',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90',
              'disabled:opacity-30 disabled:bg-primary'
            )}
            onClick={handleSend}
            disabled={disabled || !hasContent}
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
