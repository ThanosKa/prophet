import { useCallback } from 'react'
import { useUIStore } from '@/store/uiStore'

export function useContextUsage() {
  const {
    contextTokens,
    maxContextTokens,
    addContextTokens,
    resetContextTokens,
    getContextPercentage,
  } = useUIStore()

  const trackUsage = useCallback(
    (inputTokens: number, outputTokens: number) => {
      addContextTokens(inputTokens + outputTokens)
    },
    [addContextTokens]
  )

  const resetUsage = useCallback(() => {
    resetContextTokens()
  }, [resetContextTokens])

  return {
    contextTokens,
    maxContextTokens,
    percentage: getContextPercentage(),
    trackUsage,
    resetUsage,
  }
}
