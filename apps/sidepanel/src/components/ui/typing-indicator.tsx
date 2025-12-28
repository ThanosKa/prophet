import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative inline-block">
        <span className="text-sm text-muted-foreground/60 animate-shimmer bg-gradient-to-r from-muted-foreground/60 via-muted-foreground to-muted-foreground/60 bg-clip-text text-transparent">
          Planning next moves...
        </span>
      </div>
    </div>
  )
}
