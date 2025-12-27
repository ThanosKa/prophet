// Anthropic API pricing (per 1M tokens in USD)
// Source: https://claude.com/pricing (Claude 4.5 series)
export const MODEL_PRICING = {
  "claude-haiku-4-5": {
    input: 1.0,   // $1 per MTok
    output: 5.0,  // $5 per MTok
  },
  "claude-sonnet-4-5": {
    input: 3.0,   // $3 per MTok
    output: 15.0, // $15 per MTok
  },
  "claude-opus-4-5": {
    input: 5.0,   // $5 per MTok
    output: 25.0, // $25 per MTok
  },
} as const;

// 20% markup on API costs - ensures profitability even with bonus credits
export const MARKUP = 1.20;

// Tier configuration
// Credits = cents to user (1 credit = 1 cent value)
// 20% markup ensures profitability even at 100% usage with bonus credits
export const TIER_CONFIG = {
  free: {
    price: 0,
    credits: 50,      // $0.50 value
    bonus: 0,
    models: ['claude-haiku-4-5'] as const,
  },
  pro: {
    price: 999,       // $9.99/month
    credits: 1100,    // $11 value (+10% bonus)
    bonus: 10,
    models: ['claude-haiku-4-5', 'claude-sonnet-4-5'] as const,
  },
  premium: {
    price: 2999,      // $29.99/month
    credits: 3500,    // $35 value (+17% bonus)
    bonus: 17,
    models: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'] as const,
  },
  ultra: {
    price: 5999,      // $59.99/month
    credits: 7000,    // $70 value (+17% bonus)
    bonus: 17,
    models: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-opus-4-5'] as const,
  },
} as const;

export type ModelName = keyof typeof MODEL_PRICING;
export type TierName = keyof typeof TIER_CONFIG;

/**
 * Calculate the credit cost for an API call
 * 1 credit = 1 cent of API cost (with markup)
 *
 * Example: 1000 input + 500 output tokens with Sonnet
 * - Input: (1000/1M) * $3 = $0.003
 * - Output: (500/1M) * $15 = $0.0075
 * - Total: $0.0105 = 1.05 cents
 * - With 5% markup: 1.10 cents → 2 credits (rounded up)
 */
export function calculateCostInCredits(
  model: ModelName,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  // Calculate raw API cost in USD
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const totalCostUSD = inputCost + outputCost;

  // Apply markup and convert to credits (1 credit = 1 cent)
  const costWithMarkup = totalCostUSD * MARKUP;
  const credits = Math.ceil(costWithMarkup * 100);

  // Minimum 1 credit per request
  return Math.max(1, credits);
}

// Legacy function for backwards compatibility
export function calculateCostInCents(
  model: ModelName,
  inputTokens: number,
  outputTokens: number
): number {
  return calculateCostInCredits(model, inputTokens, outputTokens);
}

/**
 * Calculate guaranteed profit per tier
 */
export function calculateTierProfit(tier: TierName): {
  platformFee: number;
  apiPool: number;
  markupProfit: number;
  totalMinProfit: number;
} {
  const config = TIER_CONFIG[tier];
  const platformFee = config.price - config.credits;
  const apiPool = config.credits;
  const markupProfit = Math.floor(apiPool * (MARKUP - 1)); // 5% of API pool
  const totalMinProfit = platformFee + markupProfit;

  return { platformFee, apiPool, markupProfit, totalMinProfit };
}
