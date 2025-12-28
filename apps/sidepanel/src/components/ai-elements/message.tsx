"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

interface MessageProps {
  from: "user" | "assistant"
  children: React.ReactNode
}

export function Message({ from, children }: MessageProps) {
  return (
    <div
      className={cn(
        "flex gap-3 py-4 px-4",
        from === "assistant" && "bg-muted/30"
      )}
    >
      <div className="flex-shrink-0">
        <div className={cn(
          "h-7 w-7 rounded-full flex items-center justify-center",
          from === "assistant" ? "bg-primary" : "bg-muted"
        )}>
          {from === "assistant" ? (
            <Bot className="h-4 w-4 text-primary-foreground" />
          ) : (
            <User className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        {children}
      </div>
    </div>
  )
}

export function MessageContent({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>
}

export function MessageResponse({ children }: { children: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, className, children, ...props }) {
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
