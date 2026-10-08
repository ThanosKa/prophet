import { CLAUDE_MODELS, MODEL_CONFIG } from '@prophet/shared'
import type { ModelName } from '@/lib/pricing'

type Tier = 'free' | 'pro' | 'premium' | 'ultra'

export type InsufficientBalanceDetails = {
  pricingUrl: '/pricing'
  isContinuation: boolean
  suggestedModel?: typeof CLAUDE_MODELS.HAIKU
  suggestDisableThinking?: boolean
  canUpgrade: boolean
}

function modelLabel(model: ModelName): string {
  return MODEL_CONFIG.find((config) => config.id === model)?.label ?? model
}

/**
 * Installed extension builds show only the `error` text, so each variant must name
 * the way out on its own; `details` carries the same advice for newer clients.
 */
export function describeInsufficientBalance({
  model,
  enableThinking,
  isContinuation,
  tier,
  fits,
}: {
  model: ModelName
  enableThinking: boolean
  isContinuation: boolean
  tier: Tier
  fits: (option: { model: ModelName; enableThinking: boolean }) => boolean
}): { message: string; details: InsufficientBalanceDetails } {
  const haiku = CLAUDE_MODELS.HAIKU
  const haikuLabel = modelLabel(haiku)
  const haikuFits = model !== haiku && fits({ model: haiku, enableThinking: false })
  const base: InsufficientBalanceDetails = {
    pricingUrl: '/pricing',
    isContinuation,
    canUpgrade: tier !== 'ultra',
  }

  if (!isContinuation && enableThinking && fits({ model, enableThinking: false })) {
    return {
      message: haikuFits
        ? `Not enough credits left for ${modelLabel(model)} with Thinking. Turn off Thinking, switch to ${haikuLabel}, or buy more credits.`
        : `Not enough credits left for ${modelLabel(model)} with Thinking. Turn off Thinking or buy more credits.`,
      details: {
        ...base,
        ...(haikuFits && { suggestedModel: haiku }),
        suggestDisableThinking: true,
      },
    }
  }

  if (isContinuation && haikuFits) {
    return {
      message: `Stopped partway: not enough credits left to finish this task. Switch to ${haikuLabel} and send "continue", or buy more credits.`,
      details: { ...base, suggestedModel: haiku },
    }
  }

  if (isContinuation) {
    return {
      message: `Stopped partway: you're out of credits. Buy more credits, then send "continue".`,
      details: base,
    }
  }

  if (haikuFits) {
    return {
      message: `Not enough credits left for ${modelLabel(model)}. Switch to ${haikuLabel} or buy more credits.`,
      details: { ...base, suggestedModel: haiku },
    }
  }

  return {
    message: base.canUpgrade
      ? `You're out of credits. Buy more credits or upgrade your plan to keep going.`
      : `You're out of credits. Buy extra credits to keep going.`,
    details: base,
  }
}
