import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span 
        className="text-sm text-muted-foreground"
        style={{
          background: 'linear-gradient(90deg, rgba(var(--muted-foreground-rgb, 115, 115, 115), 0.6) 0%, rgba(var(--muted-foreground-rgb, 115, 115, 115), 1) 50%, rgba(var(--muted-foreground-rgb, 115, 115, 115), 0.6) 100%)',
          backgroundSize: '200% 100%',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'shimmer 1.5s infinite'
        }}
      >
        Planning next moves...
      </span>
    </div>
  )
}
