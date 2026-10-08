// Anthropic API pricing (per 1M tokens in USD)
// Source: https://platform.claude.com/docs/en/about-claude/pricing
type ModelRates = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

type ModelPricing = ModelRates & {
  // Above `thresholdTokens` of prompt, every token of the request bills at these rates.
  longPrompt?: ModelRates & { thresholdTokens: number };
};

export const MODEL_PRICING = {
  "claude-haiku-5-5": {
    input: 0.1,   // $0.10 per MTok
    output: 0.5,  // $0.50 per MTok
    cacheWrite: 0.125, // $0.125 per MTok (5-minute TTL, 1.25x input)
    cacheRead: 0.01,  // $0.01 per MTok (0.1x input)
    longPrompt: {
      thresholdTokens: 100_000,
      input: 0.5,
      output: 2.5,
      cacheWrite: 0.625,
      cacheRead: 0.05,
    },
  },
  "claude-sonnet-5-5": {
    input: 2.0,   // $2 per MTok
    output: 10.0, // $10 per MTok
    cacheWrite: 2.5, // $2.50 per MTok (5-minute TTL, 1.25x input)
    cacheRead: 0.1,  // $0.10 per MTok (0.05x input)
  },
  "claude-opus-5-5": {
    input: 4.0,   // $4 per MTok
    output: 20.0, // $20 per MTok
    cacheWrite: 5.0, // $5 per MTok (5-minute TTL, 1.25x input)
    cacheRead: 0.2,  // $0.20 per MTok (0.05x input)
  },
} as const satisfies Record<string, ModelPricing>;

// Prophet adds the Margin on top of Anthropic's cost on every Turn.
export const MARGIN = 0.25;
export const MINIMUM_CHARGE_CREDITS = 1;

// Anthropic bills server-side web search at $10 per 1,000 searches on top of tokens.
export const WEB_SEARCH_PRICE_PER_1K_USD = 10.0;
export const WEB_SEARCH_PRICE_PER_SEARCH_USD = WEB_SEARCH_PRICE_PER_1K_USD / 1000;

export const ALL_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] as const;

// Stripe Price IDs (not secret - safe to hardcode as fallback)
const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_1SoTslK3NgGLoo5cqr6CQDJ9',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_1SoTsnK3NgGLoo5cgIrONmV2',
  ultra: process.env.STRIPE_PRICE_ULTRA || 'price_1SoTsqK3NgGLoo5cZQM8Z1lH',
  extraCredits: process.env.STRIPE_PRICE_EXTRA_CREDITS || 'price_1SoTsuK3NgGLoo5cZSh04y1U',
};
// Prices are in cents. A plan's Credits equal its price (no Bonus); `free.credits` is the
// one-time Free grant a new user gets on sign-up.
export const TIER_CONFIG = {
  free: {
    price: 0,
    credits: 7,
    priceId: null,
  },
  pro: {
    price: 999,
    credits: 1000,
    priceId: STRIPE_PRICE_IDS.pro,
  },
  premium: {
    price: 2999,
    credits: 3000,
    priceId: STRIPE_PRICE_IDS.premium,
  },
  ultra: {
    price: 5999,
    credits: 6000,
    priceId: STRIPE_PRICE_IDS.ultra,
  },
} as const;

// Extra credits: a one-time purchase outside any plan.
export const EXTRA_CREDITS = {
  price: 1000,
  credits: 1000,
  priceId: STRIPE_PRICE_IDS.extraCredits,
} as const;

/** Credits as the dollars they are worth for marketing copy: whole dollars drop the cents ("$10", "$0.07"). */
export function formatCreditsAsDollars(credits: number): string {
  return credits % 100 === 0 ? `$${credits / 100}` : `$${(credits / 100).toFixed(2)}`;
}

export type ModelName = keyof typeof MODEL_PRICING;
export type TierName = keyof typeof TIER_CONFIG;

/**
 * Mirrors Anthropic's `usage` buckets, which are disjoint: `inputTokens` is only the
 * uncached remainder after the last cache breakpoint, so the prompt's full size is
 * inputTokens + cacheCreationInputTokens + cacheReadInputTokens.
 */
export type TokenUsage = {
  inputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  outputTokens: number;
  webSearchRequests?: number;
};

/**
 * Credit cost of one API call from its reported usage. Cache writes use the
 * 5-minute TTL rate; nothing here requests the 1-hour TTL.
 */
export function calculateUsageCostInCredits(model: ModelName, usage: TokenUsage): number {
  const modelPricing: ModelPricing | undefined = MODEL_PRICING[model];

  if (!modelPricing) {
    throw new Error(`Unknown model: ${model}`);
  }

  const promptTokens =
    usage.inputTokens + usage.cacheCreationInputTokens + usage.cacheReadInputTokens;
  const pricing =
    modelPricing.longPrompt && promptTokens > modelPricing.longPrompt.thresholdTokens
      ? modelPricing.longPrompt
      : modelPricing;

  const perToken = (tokens: number, usdPerMTok: number) => (tokens / 1_000_000) * usdPerMTok;
  const totalCostUSD =
    perToken(usage.inputTokens, pricing.input) +
    perToken(usage.cacheCreationInputTokens, pricing.cacheWrite) +
    perToken(usage.cacheReadInputTokens, pricing.cacheRead) +
    perToken(usage.outputTokens, pricing.output) +
    Math.max(0, usage.webSearchRequests ?? 0) * WEB_SEARCH_PRICE_PER_SEARCH_USD;

  return Math.max(MINIMUM_CHARGE_CREDITS, centsWithMarginRoundedUp(totalCostUSD * 100));
}

/**
 * 1 Credit = 1 cent. Rounds to 1e-9 of a cent before rounding up, so float noise in an
 * exact charge (5.6 cents x 1.25 = 7.000000000000001) doesn't bill an extra Credit.
 */
function centsWithMarginRoundedUp(costCents: number): number {
  const charged = costCents * (1 + MARGIN);
  return Math.ceil(Math.round(charged * 1e9) / 1e9);
}

/**
 * Calculate the credit cost for an API call with no prompt caching
 *
 * Example: 1000 input + 500 output tokens with Sonnet
 * - Input: (1000/1M) * $2 = $0.002
 * - Output: (500/1M) * $10 = $0.005
 * - Total: $0.007 = 0.7 cents
 * - With the 25% Margin: 0.875 cents → 1 credit (rounded up)
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
  return calculateUsageCostInCredits(model, {
    inputTokens,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens,
    webSearchRequests,
  });
}

/**
 * Credit cost, Margin included, of the web-search portion of a turn, for reporting the
 * search fee separately from token spend.
 */
export function calculateWebSearchCostInCredits(webSearchRequests: number): number {
  if (webSearchRequests <= 0) return 0;
  return centsWithMarginRoundedUp(webSearchRequests * WEB_SEARCH_PRICE_PER_SEARCH_USD * 100);
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

// Stripe's standard card fee per charge.
export const STRIPE_FEE_PERCENT = 2.9;
export const STRIPE_FEE_FIXED_CENTS = 30;

/**
 * Profit from one charge (a plan's billing period or an extra-credits purchase) when the
 * buyer spends every Credit. Anthropic's cost is then at most Credits / (1 + Margin):
 * rounding up and the Minimum charge only ever bill more than cost plus the Margin.
 */
export function calculateWorstCaseProfit(plan: { price: number; credits: number }): {
  stripeFeeCents: number;
  maxAnthropicCostCents: number;
  profitCents: number;
} {
  const stripeFeeCents = (plan.price * STRIPE_FEE_PERCENT) / 100 + STRIPE_FEE_FIXED_CENTS;
  const maxAnthropicCostCents = plan.credits / (1 + MARGIN);
  const profitCents = plan.price - stripeFeeCents - maxAnthropicCostCents;

  return { stripeFeeCents, maxAnthropicCostCents, profitCents };
}
