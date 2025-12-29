"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: "user" | "assistant"
}

export const Message = ({ className, from, children, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    data-from={from}
    {...props}
  >
    {children}
  </div>
)

export type MessageContentProps = React.HTMLAttributes<HTMLDivElement>

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      "flex w-fit max-w-full min-w-0 flex-col gap-2 text-sm",
      "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3",
      "group-[.is-assistant]:text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export type MessageActionsProps = React.HTMLAttributes<HTMLDivElement>

export const MessageActions = ({ children, className, ...props }: MessageActionsProps) => (
  <div
    className={cn(
      "flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100",
      "group-[.is-user]:justify-end",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

type MessageBranchContextValue = {
  currentIndex: number
  totalCount: number
  setCurrentIndex: (index: number) => void
  isStreaming?: boolean
}

const MessageBranchContext = React.createContext<MessageBranchContextValue | null>(null)

function useMessageBranch() {
  const context = React.useContext(MessageBranchContext)
  if (!context) {
    throw new Error("useMessageBranch must be used within a MessageBranch")
  }
  return context
}

export interface MessageBranchProps {
  children: React.ReactNode
  totalCount: number
  defaultIndex?: number
  isStreaming?: boolean
}

export const MessageBranch = ({
  children,
  totalCount,
  defaultIndex = 0,
  isStreaming = false,
}: MessageBranchProps) => {
  const [currentIndex, setCurrentIndex] = React.useState(defaultIndex)

  React.useEffect(() => {
    if (defaultIndex !== currentIndex) {
      setCurrentIndex(defaultIndex)
    }
  }, [defaultIndex, currentIndex])

  const value = React.useMemo(
    () => ({ currentIndex, totalCount, setCurrentIndex, isStreaming }),
    [currentIndex, totalCount, isStreaming]
  )

  return (
    <MessageBranchContext.Provider value={value}>
      {children}
    </MessageBranchContext.Provider>
  )
}

export type MessageBranchContentProps = React.HTMLAttributes<HTMLDivElement>

export const MessageBranchContent = ({
  children,
  className,
  ...props
}: MessageBranchContentProps) => (
  <div className={cn("flex flex-col gap-2", className)} {...props}>
    {children}
  </div>
)

export type MessageBranchSelectorProps = React.HTMLAttributes<HTMLDivElement>

export const MessageBranchSelector = ({
  children,
  className,
  ...props
}: MessageBranchSelectorProps) => {
  const { totalCount } = useMessageBranch()

  if (totalCount <= 1) return null

  return (
    <div
      className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export type MessageBranchPreviousProps = React.ComponentProps<typeof Button>

export const MessageBranchPrevious = ({
  className,
  ...props
}: MessageBranchPreviousProps) => {
  const { currentIndex, setCurrentIndex, isStreaming } = useMessageBranch()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6", className)}
      onClick={() => setCurrentIndex(currentIndex - 1)}
      disabled={currentIndex === 0 || isStreaming}
      {...props}
    >
      <ChevronLeft className="h-3 w-3" />
      <span className="sr-only">Previous version</span>
    </Button>
  )
}

export type MessageBranchNextProps = React.ComponentProps<typeof Button>

export const MessageBranchNext = ({ className, ...props }: MessageBranchNextProps) => {
  const { currentIndex, totalCount, setCurrentIndex, isStreaming } = useMessageBranch()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6", className)}
      onClick={() => setCurrentIndex(currentIndex + 1)}
      disabled={currentIndex >= totalCount - 1 || isStreaming}
      {...props}
    >
      <ChevronRight className="h-3 w-3" />
      <span className="sr-only">Next version</span>
    </Button>
  )
}

export type MessageBranchPageProps = React.HTMLAttributes<HTMLSpanElement>

export const MessageBranchPage = ({ className, ...props }: MessageBranchPageProps) => {
  const { currentIndex, totalCount } = useMessageBranch()

  return (
    <span className={cn("tabular-nums", className)} {...props}>
      {currentIndex + 1} of {totalCount}
    </span>
  )
}

export function MessageResponse({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const isInline = !match

            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm" {...props}>
                  {children}
                </code>
              )
            }

            return (
              <div className="my-3 rounded-lg overflow-hidden bg-zinc-900">
                <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                  <span className="text-xs text-zinc-400 font-mono">{language || 'code'}</span>
                </div>
                <pre className="p-4 overflow-x-auto">
                  <code className="text-sm font-mono" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          a({ children, href, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:opacity-80"
                {...props}
              >
                {children}
              </a>
            )
          },
          ul({ children, ...props }) {
            return (
              <ul className="list-disc pl-4 my-2 space-y-1" {...props}>
                {children}
              </ul>
            )
          },
          ol({ children, ...props }) {
            return (
              <ol className="list-decimal pl-4 my-2 space-y-1" {...props}>
                {children}
              </ol>
            )
          },
          p({ children, ...props }) {
            return (
              <p className="my-2" {...props}>
                {children}
              </p>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
