import { useCallback } from 'react'
import { useUIStore } from '@/store/uiStore'

export function useContextUsage() {
  const {
    contextTokens,
    contextInputTokens,
    contextOutputTokens,
    contextReasoningTokens,
    contextCachedInputTokens,
    maxContextTokens,
    addContextUsage,
    resetContextTokens,
    getContextPercentage,
  } = useUIStore()

  const trackUsage = useCallback(
    (inputTokens: number, outputTokens: number) => {
      addContextUsage({ inputTokens, outputTokens })
    },
    [addContextUsage]
  )

  const resetUsage = useCallback(() => {
    resetContextTokens()
  }, [resetContextTokens])

  return {
    contextTokens,
    contextInputTokens,
    contextOutputTokens,
    contextReasoningTokens,
    contextCachedInputTokens,
    maxContextTokens,
    percentage: getContextPercentage(),
    trackUsage,
    resetUsage,
  }
}
