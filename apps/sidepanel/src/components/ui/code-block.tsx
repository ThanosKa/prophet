import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface CodeBlockProps {
  language?: string
  children: string
  className?: string
}

export function CodeBlock({ language, children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('relative group rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--chatbot-muted)] border-b border-border/50">
        <span className="text-xs text-muted-foreground font-mono">
          {language || 'text'}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-zinc-400" />
          )}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#1e1e1e',
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}
