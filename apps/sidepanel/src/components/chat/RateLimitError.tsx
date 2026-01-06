import { useState, useEffect } from 'react'
import { Clock, X } from 'lucide-react'

interface RateLimitErrorProps {
  error: string
  retryAfter?: number | null
  remaining?: number | null
  onDismiss?: () => void
}

export function RateLimitError({ error, retryAfter, remaining, onDismiss }: RateLimitErrorProps) {
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (!retryAfter || retryAfter <= 0) return

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Need to reset countdown when retryAfter prop changes
    setCountdown(retryAfter)

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [retryAfter])

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-destructive font-medium">{error}</p>
          {countdown > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 bg-destructive/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-destructive transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((retryAfter! - countdown) / retryAfter!) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-destructive/80 font-medium tabular-nums shrink-0">
                {formatTime(countdown)}
              </p>
            </div>
          )}
          {remaining !== null && remaining !== undefined && (
            <p className="text-xs text-destructive/70 mt-1.5">
              {remaining} request{remaining !== 1 ? 's' : ''} remaining
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="cursor-pointer shrink-0 p-1 hover:bg-destructive/10 rounded transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4 text-destructive" />
          </button>
        )}
      </div>
    </div>
  )
}
