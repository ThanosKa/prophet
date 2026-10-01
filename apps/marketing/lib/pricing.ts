// Anthropic API pricing (per 1M tokens in USD)
// Source: https://claude.com/pricing
export const MODEL_PRICING = {
  "claude-haiku-4-5": {
    input: 1.0,   // $1 per MTok
    output: 5.0,  // $5 per MTok
  },
  "claude-sonnet-5-5": {
    input: 2.0,   // $2 per MTok
    output: 10.0, // $10 per MTok
  },
  "claude-opus-5-5": {
    input: 4.0,   // $4 per MTok
    output: 20.0, // $20 per MTok
  },
} as const;

export const MARKUP = 1.20;

// Anthropic bills server-side web search at $10 per 1,000 searches on top of tokens.
export const WEB_SEARCH_PRICE_PER_1K_USD = 10.0;
export const WEB_SEARCH_PRICE_PER_SEARCH_USD = WEB_SEARCH_PRICE_PER_1K_USD / 1000;

export const ALL_MODELS = ['claude-haiku-4-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] as const;

// Stripe Price IDs (not secret - safe to hardcode as fallback)
const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_1SoTslK3NgGLoo5cqr6CQDJ9',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_1SoTsnK3NgGLoo5cgIrONmV2',
  ultra: process.env.STRIPE_PRICE_ULTRA || 'price_1SoTsqK3NgGLoo5cZQM8Z1lH',
  extraCredits: process.env.STRIPE_PRICE_EXTRA_CREDITS || 'price_1SoTsuK3NgGLoo5cZSh04y1U',
};
export const TIER_CONFIG = {
  free: {
    price: 0,
    credits: 20,      // $0.20 value
    bonus: 0,
    priceId: null,
  },
  pro: {
    price: 999,       // $9.99/month
    credits: 1100,    // $11 value (+10% bonus)
    bonus: 10,
    priceId: STRIPE_PRICE_IDS.pro,
  },
  premium: {
    price: 2999,      // $29.99/month
    credits: 3500,    // $35 value (+17% bonus)
    bonus: 17,
    priceId: STRIPE_PRICE_IDS.premium,
  },
  ultra: {
    price: 5999,      // $59.99/month
    credits: 7000,    // $70 value (+17% bonus)
    bonus: 17,
    priceId: STRIPE_PRICE_IDS.ultra,
  },
} as const;

// Extra Credits - one-time purchase (no subscription)
export const EXTRA_CREDITS = {
  price: 1000,        // $10.00 one-time
  credits: 1000,      // $10 value (no bonus)
  bonus: 0,
  priceId: STRIPE_PRICE_IDS.extraCredits,
} as const;

export type ModelName = keyof typeof MODEL_PRICING;
export type TierName = keyof typeof TIER_CONFIG;

/**
 * Calculate the credit cost for an API call
 * 1 credit = 1 cent of API cost (with 20% markup)
 *
 * Example: 1000 input + 500 output tokens with Sonnet
 * - Input: (1000/1M) * $2 = $0.002
 * - Output: (500/1M) * $10 = $0.005
 * - Total: $0.007 = 0.7 cents
 * - With 20% markup: 0.84 cents → 1 credit (rounded up)
 *
 * `webSearchRequests` bills Anthropic's per-search server-tool fee on top of tokens.
 * A single search is $0.01, so it dominates a short turn's cost — omitting it would
 * mean serving searches at a loss.
 */
export function calculateCostInCredits(
  model: ModelName,
  inputTokens: number,
  outputTokens: number,
  webSearchRequests = 0
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  // Calculate raw API cost in USD
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const searchCost = Math.max(0, webSearchRequests) * WEB_SEARCH_PRICE_PER_SEARCH_USD;
  const totalCostUSD = inputCost + outputCost + searchCost;

  // Apply markup and convert to credits (1 credit = 1 cent)
  const costWithMarkup = totalCostUSD * MARKUP;
  const credits = Math.ceil(costWithMarkup * 100);

  // Minimum 1 credit per request
  return Math.max(1, credits);
}

/**
 * Marked-up credit cost of the web-search portion of a turn, for reporting the
 * search fee separately from token spend.
 */
export function calculateWebSearchCostInCredits(webSearchRequests: number): number {
  if (webSearchRequests <= 0) return 0;
  return Math.ceil(
    webSearchRequests * WEB_SEARCH_PRICE_PER_SEARCH_USD * MARKUP * 100
  );
}

// Legacy function for backwards compatibility
export function calculateCostInCents(
  model: ModelName,
  inputTokens: number,
  outputTokens: number,
  webSearchRequests = 0
): number {
  return calculateCostInCredits(model, inputTokens, outputTokens, webSearchRequests);
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
