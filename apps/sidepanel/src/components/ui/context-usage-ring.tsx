import { Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ContextUsageRingProps {
  used: number
  max: number
  size?: 'sm' | 'md'
  className?: string
}

export function ContextUsageRing({
  used,
  max,
  size = 'sm',
  className,
}: ContextUsageRingProps) {
  const percentage = Math.min((used / max) * 100, 100)
  const circumference = 2 * Math.PI * 10
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getColor = () => {
    if (percentage >= 80) return 'stroke-red-500'
    if (percentage >= 50) return 'stroke-yellow-500'
    return 'stroke-green-500'
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000) {
      return `${Math.round(tokens / 1000)}k`
    }
    return tokens.toString()
  }

  const dimensions = size === 'sm' ? 24 : 32
  const strokeWidth = size === 'sm' ? 2 : 3
  const brainSize = size === 'sm' ? 10 : 14

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'relative inline-flex items-center justify-center cursor-default',
              className
            )}
            style={{ width: dimensions, height: dimensions }}
          >
            <svg
              className="transform -rotate-90"
              width={dimensions}
              height={dimensions}
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth={strokeWidth}
                className="stroke-muted"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn('transition-all duration-300', getColor())}
              />
            </svg>
            <Brain
              className="absolute text-muted-foreground"
              size={brainSize}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {formatTokens(used)} / {formatTokens(max)} tokens
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
