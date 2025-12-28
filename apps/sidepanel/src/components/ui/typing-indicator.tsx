import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
}

const dotClasses = [
  'animate-bounce-dot',
  'animate-bounce-dot-delay-1',
  'animate-bounce-dot-delay-2',
]

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className="sr-only">Loading...</span>
      {dotClasses.map((animClass, i) => (
        <span
          key={i}
          className={cn('w-2 h-2 rounded-full bg-muted-foreground', animClass)}
        />
      ))}
    </div>
  )
}
