import { Bot, User, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StreamingText } from '@/components/ui/streaming-text'
import { CodeBlock } from '@/components/ui/code-block'
import { ToolCallCollapsible } from './ToolCallCollapsible'
import { cn } from '@/lib/utils'
import type { Message, ToolCall } from '@prophet/shared'

interface AgentMessage extends Message {
  toolCalls?: ToolCall[]
}

interface EnhancedChatMessageProps {
  message: AgentMessage
  isStreaming?: boolean
  streamingContent?: string
  currentToolCall?: ToolCall | null
}

export function EnhancedChatMessage({
  message,
  isStreaming = false,
  streamingContent,
  currentToolCall,
}: EnhancedChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isAssistant = message.role === 'assistant'
  const displayContent = streamingContent || message.content

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'group flex gap-3 py-4 px-4 transition-colors duration-200 hover:bg-accent/40',
        isAssistant ? 'bg-muted/30' : ''
      )}
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback
          className={cn(
            'text-xs',
            isAssistant ? 'bg-primary text-primary-foreground' : 'bg-secondary'
          )}
        >
          {isAssistant ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div
            className={cn(
              'text-sm leading-relaxed flex-1 overflow-hidden transition-colors duration-300',
              isStreaming ? 'text-muted-foreground italic' : 'text-foreground'
            )}
          >
            {isStreaming && streamingContent ? (
              <StreamingText text={displayContent} isStreaming />
            ) : isAssistant ? (
              <div className="prose prose-sm dark:prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const isInline = !match
                      if (isInline) {
                        return (
                          <code
                            className="px-1.5 py-0.5 rounded bg-muted font-mono text-sm"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      }
                      return (
                        <CodeBlock language={match[1]} className="my-3">
                          {String(children).replace(/\n$/, '')}
                        </CodeBlock>
                      )
                    },
                    pre({ children }) {
                      return <>{children}</>
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 hover:opacity-80"
                        >
                          {children}
                        </a>
                      )
                    },
                    ul({ children }) {
                      return <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>
                    },
                    ol({ children }) {
                      return <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>
                    },
                    p({ children }) {
                      return <p className="my-2">{children}</p>
                    },
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{displayContent}</p>
            )}
          </div>

          {isAssistant && !isStreaming && displayContent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>

        {isAssistant && (message.toolCalls || currentToolCall) && (
          <div className="space-y-1">
            {message.toolCalls?.map((tc) => (
              <ToolCallCollapsible key={tc.id} toolCall={tc} />
            ))}
            {currentToolCall && (
              <ToolCallCollapsible toolCall={currentToolCall} isExecuting />
            )}
          </div>
        )}

        {isAssistant && message.outputTokens && !isStreaming && (
          <p className="text-xs text-muted-foreground">
            {message.outputTokens} tokens
          </p>
        )}
      </div>
    </div>
  )
}
