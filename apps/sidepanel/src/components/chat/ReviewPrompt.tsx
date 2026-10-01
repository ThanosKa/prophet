import { useEffect } from 'react'
import { Star, X } from 'lucide-react'
import { CWS_REVIEWS_URL } from '@/lib/review-prompt'
import { useReviewPromptStore } from '@/store/reviewPromptStore'

interface ReviewPromptProps {
  /** Hidden while a run is in progress so it never interrupts work. */
  isRunning: boolean
}

/**
 * Small non-modal ask for a Chrome Web Store review. Same prompt for everyone: there is no
 * "are you happy?" step that would route only satisfied users to the store.
 */
export function ReviewPrompt({ isRunning }: ReviewPromptProps) {
  const visible = useReviewPromptStore((state) => state.visible)
  const hydrate = useReviewPromptStore((state) => state.hydrate)
  const snooze = useReviewPromptStore((state) => state.snooze)
  const optOut = useReviewPromptStore((state) => state.optOut)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  if (!visible || isRunning) return null

  const handleReview = () => {
    chrome.tabs.create({ url: CWS_REVIEWS_URL })
    void optOut()
  }

  return (
    <div
      role="region"
      aria-label="Rate Prophet"
      className="mx-4 mb-2 p-3 bg-muted/50 border rounded-lg flex items-start gap-3"
    >
      <Star className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">Enjoying Prophet? A review on the Chrome Web Store helps others find it.</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <button
            onClick={handleReview}
            className="cursor-pointer text-primary hover:underline font-medium"
          >
            Leave a review
          </button>
          <button
            onClick={() => void snooze()}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Not now
          </button>
          <button
            onClick={() => void optOut()}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Don&apos;t ask again
          </button>
        </div>
      </div>
      <button
        onClick={() => void snooze()}
        className="cursor-pointer shrink-0 p-1 hover:bg-muted rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  )
}
