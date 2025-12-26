export const MODEL_PRICING = {
  'claude-3-5-haiku-20241022': {
    input: 1.0,
    output: 5.0,
  },
  'claude-sonnet-4-20250514': {
    input: 3.0,
    output: 15.0,
  },
  'claude-opus-4-5-20250514': {
    input: 15.0,
    output: 75.0,
  },
} as const

export const MARKUP = 1.3

export const TIER_CONFIG = {
  free: { price: 0, credits: 100, bonus: 0 },
  pro: { price: 999, credits: 999, bonus: 0 },
  premium: { price: 2999, credits: 3599, bonus: 20 },
  ultra: { price: 5999, credits: 7499, bonus: 25 },
} as const

export type ModelName = keyof typeof MODEL_PRICING
export type TierName = keyof typeof TIER_CONFIG

export function calculateCostInCents(
  model: ModelName,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model]

  if (!pricing) {
    throw new Error(`Unknown model: ${model}`)
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  const totalCost = inputCost + outputCost

  const costWithMarkup = totalCost * MARKUP
  const costInCents = Math.ceil(costWithMarkup * 100)

  return costInCents
}
