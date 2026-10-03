import { Brain, ExternalLink, Info, X, Zap } from 'lucide-react'
import { MODEL_CONFIG } from '@prophet/shared'
import { RateLimitError } from './RateLimitError'
import { config } from '@/lib/config'
import { useUIStore } from '@/store/uiStore'
import type { ErrorInfo } from '@/lib/user-facing-errors'

export interface ChatBannerProps {
  error?: string | null
  errorInfo?: ErrorInfo | null
  retryAfter?: number | null
  remaining?: number | null
  notice?: string | null
  onDismissError?: () => void
  onDismissNotice?: () => void
}

export function ChatBanner({
  error,
  errorInfo,
  retryAfter,
  remaining,
  notice,
  onDismissError,
  onDismissNotice,
}: ChatBannerProps) {
  return (
    <>
      {notice && <NoticeBanner notice={notice} onDismiss={onDismissNotice} />}
      {error && retryAfter !== null && retryAfter !== undefined ? (
        <RateLimitError error={error} retryAfter={retryAfter} remaining={remaining} onDismiss={onDismissError} />
      ) : error ? (
        <ErrorBanner error={error} errorInfo={errorInfo} onDismiss={onDismissError} />
      ) : null}
    </>
  )
}

function NoticeBanner({ notice, onDismiss }: { notice: string; onDismiss?: () => void }) {
  return (
    <div
      role="status"
      className="mx-4 mb-2 p-3 bg-muted/60 border border-border rounded-lg flex items-start gap-3"
    >
      <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <p className="flex-1 min-w-0 text-sm text-muted-foreground">{notice}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="cursor-pointer shrink-0 p-1 hover:bg-muted rounded transition-colors"
          aria-label="Dismiss notice"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

function ErrorBanner({
  error,
  errorInfo,
  onDismiss,
}: {
  error: string
  errorInfo?: ErrorInfo | null
  onDismiss?: () => void
}) {
  const { selectedModel, setSelectedModel, enableThinking, setEnableThinking } = useUIStore()
  const isInsufficientBalance = errorInfo?.code === 'INSUFFICIENT_BALANCE'
  const suggestedModel = errorInfo?.suggestedModel
  const suggestedModelLabel = MODEL_CONFIG.find((model) => model.id === suggestedModel)?.label
  const showSwitchModel = Boolean(suggestedModel && suggestedModelLabel && suggestedModel !== selectedModel)
  const showDisableThinking = Boolean(errorInfo?.suggestDisableThinking && enableThinking)
  const showUpgrade = errorInfo?.canUpgrade !== false

  const handleUpgradeClick = () => {
    const pricingUrl = errorInfo?.pricingUrl || '/pricing'
    window.open(`${config.apiUrl}${pricingUrl}`, '_blank')
    onDismiss?.()
  }

  const handleBuyCreditsClick = () => {
    window.open(`${config.apiUrl}/account/billing`, '_blank')
    onDismiss?.()
  }

  const handleSwitchModelClick = () => {
    if (suggestedModel) setSelectedModel(suggestedModel)
    onDismiss?.()
  }

  const handleDisableThinkingClick = () => {
    setEnableThinking(false)
    onDismiss?.()
  }

  return (
    <div
      role="alert"
      className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-destructive font-medium">{error}</p>
        {isInsufficientBalance && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleBuyCreditsClick}
              className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <Zap className="h-3.5 w-3.5" />
              Buy Extra Credits
            </button>
            {showUpgrade && (
              <button
                onClick={handleUpgradeClick}
                className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Upgrade your plan
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            {showSwitchModel && (
              <button
                onClick={handleSwitchModelClick}
                className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                Switch to {suggestedModelLabel}
              </button>
            )}
            {showDisableThinking && (
              <button
                onClick={handleDisableThinkingClick}
                className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Brain className="h-3.5 w-3.5" />
                Turn off Thinking
              </button>
            )}
          </div>
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
  )
}
