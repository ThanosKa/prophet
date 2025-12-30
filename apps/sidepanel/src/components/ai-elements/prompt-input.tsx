"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type PromptInputMessage = {
  text?: string
  files?: File[]
}

type Attachment = {
  id: string
  file: File
  url: string
}

type PromptInputContextValue = {
  text: string
  setText: (text: string) => void
  disabled?: boolean
  attachments: Attachment[]
  addFiles: (files: FileList | File[]) => void
  removeAttachment: (id: string) => void
  clear: () => void
  openFilePicker: () => void
}

const PromptInputContext = React.createContext<PromptInputContextValue | null>(null)

function usePromptInputContext() {
  const ctx = React.useContext(PromptInputContext)
  if (!ctx) throw new Error("PromptInput components must be used within <PromptInput>")
  return ctx
}

export function PromptInput({
  children,
  onSubmit,
  disabled,
  multiple,
  globalDrop,
  className,
}: {
  children: React.ReactNode
  onSubmit: (message: PromptInputMessage) => void | Promise<void>
  disabled?: boolean
  multiple?: boolean
  globalDrop?: boolean
  className?: string
}) {
  const [text, setText] = React.useState("")
  const [attachments, setAttachments] = React.useState<Attachment[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)

  const openFilePicker = React.useCallback(() => {
    inputRef.current?.click()
  }, [])

  const addFiles = React.useCallback((files: FileList | File[]) => {
    const next = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }))
    setAttachments((prev) => (multiple ? [...prev, ...next] : next.slice(0, 1)))
  }, [multiple])

  const removeAttachment = React.useCallback((id: string) => {
    setAttachments((prev) => {
      const removed = prev.find((a) => a.id === id)
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter((a) => a.id !== id)
    })
  }, [])

  const clear = React.useCallback(() => {
    setText("")
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.url))
      return []
    })
  }, [])

  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (disabled) return

    const hasText = Boolean(text.trim())
    const hasAttachments = attachments.length > 0
    if (!hasText && !hasAttachments) return

    await onSubmit({
      text: text.trim() || undefined,
      files: attachments.map((a) => a.file),
    })
    clear()
  }, [attachments, clear, disabled, onSubmit, text])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    addFiles(files)
    e.target.value = ""
  }

  const ctx: PromptInputContextValue = React.useMemo(
    () => ({
      text,
      setText,
      disabled,
      attachments,
      addFiles,
      removeAttachment,
      clear,
      openFilePicker,
    }),
    [addFiles, attachments, clear, disabled, openFilePicker, removeAttachment, text]
  )

  return (
    <PromptInputContext.Provider value={ctx}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "relative flex flex-col",
          "bg-[var(--chatbot-muted)] rounded-lg border border-border/50 shadow-sm",
          "focus-within:border-border/80 focus-within:ring-2 focus-within:ring-white/10",
          "transition-all duration-200",
          className
        )}
        data-global-drop={globalDrop ? "true" : "false"}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple={multiple}
          className="hidden"
          onChange={handleFileChange}
        />
        {children}
      </form>
    </PromptInputContext.Provider>
  )
}

export function PromptInputHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 pt-3", className)}>{children}</div>
}

export function PromptInputBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("relative", className)}>{children}</div>
}

export function PromptInputFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between px-2 pb-2", className)}>
      {children}
    </div>
  )
}

export function PromptInputTools({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-1", className)}>{children}</div>
}

export function PromptInputTextarea({
  placeholder,
  className,
  rows = 1,
  maxHeight = 120,
}: {
  placeholder?: string
  className?: string
  rows?: number
  maxHeight?: number
}) {
  const { text, setText, disabled } = usePromptInputContext()
  const ref = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (!ref.current) return
    ref.current.style.height = "auto"
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, maxHeight)}px`
  }, [maxHeight, text])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      ref.current?.form?.requestSubmit()
    }
  }

  return (
    <Textarea
      ref={ref}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={cn(
        "min-h-[44px] max-h-[120px] resize-none",
        "bg-transparent border-0 focus-visible:ring-0",
        "px-4 pt-3 pb-1",
        "placeholder:text-muted-foreground/60",
        className
      )}
    />
  )
}

export function PromptInputAttachments({
  children,
  className,
}: {
  children: (attachment: Attachment) => React.ReactNode
  className?: string
}) {
  const { attachments } = usePromptInputContext()
  if (attachments.length === 0) return null
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {attachments.map((a) => (
        <React.Fragment key={a.id}>{children(a)}</React.Fragment>
      ))}
    </div>
  )
}

export function PromptInputAttachment({
  data,
  onRemove,
}: {
  data: Attachment
  onRemove?: (id: string) => void
}) {
  const { removeAttachment } = usePromptInputContext()
  const remove = onRemove ?? removeAttachment

  return (
    <div className="relative inline-block">
      <img
        src={data.url}
        alt={data.file.name}
        className="h-16 w-16 rounded-lg object-cover"
      />
      <button
        type="button"
        onClick={() => remove(data.id)}
        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
      >
        <span className="sr-only">Remove attachment</span>
        ×
      </button>
    </div>
  )
}

export function PromptInputButton({
  children,
  onClick,
  disabled,
  variant = "ghost",
  size = "icon",
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
  className?: string
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn("h-8 w-8 rounded-full", className)}
    >
      {children}
    </Button>
  )
}

export function PromptInputActionMenu({ children }: { children: React.ReactNode }) {
  return <DropdownMenu>{children}</DropdownMenu>
}

export function PromptInputActionMenuTrigger() {
  const { disabled } = usePromptInputContext()
  return (
    <DropdownMenuTrigger asChild>
      <PromptInputButton disabled={disabled}>
        <Plus className="h-4 w-4" />
        <span className="sr-only">Add</span>
      </PromptInputButton>
    </DropdownMenuTrigger>
  )
}

export function PromptInputActionMenuContent({ children }: { children: React.ReactNode }) {
  return <DropdownMenuContent align="start">{children}</DropdownMenuContent>
}

export function PromptInputActionAddAttachments({
  label = "Add image",
}: {
  label?: string
}) {
  const { openFilePicker, disabled } = usePromptInputContext()
  return (
    <DropdownMenuItem
      onClick={() => openFilePicker()}
      disabled={disabled}
      className="gap-2"
    >
      <Plus className="h-4 w-4" />
      {label}
    </DropdownMenuItem>
  )
}

export function PromptInputSubmit({
  disabled,
  className,
  children,
}: {
  disabled?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <Button
      type="submit"
      size="icon"
      variant="ghost"
      className={cn(
        "h-8 w-8 rounded-full",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "disabled:opacity-30 disabled:bg-primary",
        className
      )}
      disabled={disabled}
    >
      {children}
    </Button>
  )
}


