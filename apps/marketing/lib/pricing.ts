type ModelRates = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

type ModelPricing = ModelRates & {
  longPrompt?: ModelRates & { thresholdTokens: number };
};

export const MODEL_PRICING = {
  "claude-haiku-5-5": {
    input: 0.1,
    output: 0.5,
    cacheWrite: 0.125,
    cacheRead: 0.01,
    longPrompt: {
      thresholdTokens: 100_000,
      input: 0.5,
      output: 2.5,
      cacheWrite: 0.625,
      cacheRead: 0.05,
    },
  },
  "claude-sonnet-5-5": {
    input: 2.0,
    output: 10.0,
    cacheWrite: 2.5,
    cacheRead: 0.1,
  },
  "claude-opus-5-5": {
    input: 4.0,
    output: 20.0,
    cacheWrite: 5.0,
    cacheRead: 0.2,
  },
} as const satisfies Record<string, ModelPricing>;

export const MARGIN = 0.25;
export const MINIMUM_CHARGE_CREDITS = 1;

export const WEB_SEARCH_PRICE_PER_1K_USD = 10.0;
export const WEB_SEARCH_PRICE_PER_SEARCH_USD = WEB_SEARCH_PRICE_PER_1K_USD / 1000;

export const ALL_MODELS = ['claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5'] as const;

const STRIPE_PRICE_IDS = {
  pro: process.env.STRIPE_PRICE_PRO || 'price_1SoTslK3NgGLoo5cqr6CQDJ9',
  premium: process.env.STRIPE_PRICE_PREMIUM || 'price_1SoTsnK3NgGLoo5cgIrONmV2',
  ultra: process.env.STRIPE_PRICE_ULTRA || 'price_1SoTsqK3NgGLoo5cZQM8Z1lH',
  extraCredits: process.env.STRIPE_PRICE_EXTRA_CREDITS || 'price_1SoTsuK3NgGLoo5cZSh04y1U',
};
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

export const EXTRA_CREDITS = {
  price: 1000,
  credits: 1000,
  priceId: STRIPE_PRICE_IDS.extraCredits,
} as const;

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

export function calculateUsageCostInCredits({
  model,
  usage,
}: {
  model: ModelName;
  usage: TokenUsage;
}): number {
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

  const perToken = ({ tokens, usdPerMTok }: { tokens: number; usdPerMTok: number }) =>
    (tokens / 1_000_000) * usdPerMTok;
  const totalCostUSD =
    perToken({ tokens: usage.inputTokens, usdPerMTok: pricing.input }) +
    perToken({ tokens: usage.cacheCreationInputTokens, usdPerMTok: pricing.cacheWrite }) +
    perToken({ tokens: usage.cacheReadInputTokens, usdPerMTok: pricing.cacheRead }) +
    perToken({ tokens: usage.outputTokens, usdPerMTok: pricing.output }) +
    Math.max(0, usage.webSearchRequests ?? 0) * WEB_SEARCH_PRICE_PER_SEARCH_USD;

  return Math.max(MINIMUM_CHARGE_CREDITS, centsWithMarginRoundedUp(totalCostUSD * 100));
}

function centsWithMarginRoundedUp(costCents: number): number {
  const charged = costCents * (1 + MARGIN);
  return Math.ceil(Math.round(charged * 1e9) / 1e9);
}

export function calculateCostInCredits({
  model,
  inputTokens,
  outputTokens,
  webSearchRequests = 0,
}: {
  model: ModelName;
  inputTokens: number;
  outputTokens: number;
  webSearchRequests?: number;
}): number {
  return calculateUsageCostInCredits({
    model,
    usage: {
      inputTokens,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      outputTokens,
      webSearchRequests,
    },
  });
}

export function calculateWebSearchCostInCredits(webSearchRequests: number): number {
  if (webSearchRequests <= 0) return 0;
  return centsWithMarginRoundedUp(webSearchRequests * WEB_SEARCH_PRICE_PER_SEARCH_USD * 100);
}

export function calculateCostInCents({
  model,
  inputTokens,
  outputTokens,
  webSearchRequests = 0,
}: {
  model: ModelName;
  inputTokens: number;
  outputTokens: number;
  webSearchRequests?: number;
}): number {
  return calculateCostInCredits({ model, inputTokens, outputTokens, webSearchRequests });
}

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

/**
 * The user has a plan that a second Checkout would duplicate: a subscription id with status
 * `active` (a scheduled cancellation included) or `past_due`. `incomplete` is not a live plan,
 * so a failed first payment can be retried through Checkout.
 */
export function hasLivePlan(user: {
  stripeSubscriptionId?: string | null
  subscriptionStatus?: string | null
}): boolean {
  return (
    Boolean(user.stripeSubscriptionId) &&
    (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'past_due')
  )
}
