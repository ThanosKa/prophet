import { describe, it, expect } from 'vitest'
import {
  calculateCostInCredits,
  calculateCostInCents,
  TIER_CONFIG,
  MODEL_PRICING,
  MARGIN,
  MINIMUM_CHARGE_CREDITS,
  EXTRA_CREDITS,
  calculateWorstCaseProfit,
  ALL_MODELS,
  WEB_SEARCH_PRICE_PER_1K_USD,
  WEB_SEARCH_PRICE_PER_SEARCH_USD,
  calculateWebSearchCostInCredits,
  calculateUsageCostInCredits,
  formatCreditsAsDollars,
  type ModelName,
} from './pricing'
import { CLAUDE_MODELS, LEGACY_MODEL_ALIASES, resolveAgentModel } from '@prophet/shared'

describe('Margin, rounding and the Minimum charge', () => {
  const haikuInput = (inputTokens: number) => ({
    inputTokens,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens: 0,
  })

  it('the Margin is 25%', () => {
    expect(MARGIN).toBe(0.25)
  })

  it('charges a Haiku Turn with an Anthropic cost of 0.8 cents exactly 1 Credit (0.8 x 1.25 = 1.0)', () => {
    // 80,000 input tokens x $0.10/MTok = $0.008
    expect(calculateUsageCostInCredits('claude-haiku-5-5', haikuInput(80_000))).toBe(1)
  })

  it('rounds up: a 1.6-cent Turn costs 2 Credits (1.6 x 1.25 = 2.0), a 2-cent Turn costs 3 (2.5)', () => {
    // Sonnet input at $2/MTok: 8,000 tokens = $0.016, 10,000 tokens = $0.02
    expect(calculateCostInCredits('claude-sonnet-5-5', 8_000, 0)).toBe(2)
    expect(calculateCostInCredits('claude-sonnet-5-5', 10_000, 0)).toBe(3)
  })

  it('does not round float noise up into an extra Credit: a 5.6-cent Turn costs exactly 7', () => {
    // Sonnet input: 28,000 tokens x $2/MTok = $0.056; 5.6 x 1.25 = 7.0
    expect(calculateCostInCredits('claude-sonnet-5-5', 28_000, 0)).toBe(7)
  })

  it('applies the Margin to a large Turn: a 100-cent Opus Turn costs 125 Credits', () => {
    // 250,000 input tokens x $4/MTok = $1.00
    expect(calculateCostInCredits('claude-opus-5-5', 250_000, 0)).toBe(125)
  })

  it('never charges less than the Minimum charge of 1 Credit', () => {
    expect(MINIMUM_CHARGE_CREDITS).toBe(1)
    expect(calculateUsageCostInCredits('claude-haiku-5-5', haikuInput(0))).toBe(1)
    expect(calculateUsageCostInCredits('claude-haiku-5-5', haikuInput(10))).toBe(1)
  })

  it('applies the Margin to the web search fee: one $0.01 search costs 2 Credits (1.25 rounded up)', () => {
    expect(calculateWebSearchCostInCredits(1)).toBe(2)
    expect(calculateWebSearchCostInCredits(20)).toBe(25)
  })
})

describe('Plans, extra credits and the Free grant', () => {
  it('gives a new user a Free grant of 7 Credits', () => {
    expect(TIER_CONFIG.free).toMatchObject({ price: 0, credits: 7 })
  })

  it('gives each plan Subscription credits equal to its price, with no Bonus', () => {
    expect(TIER_CONFIG.pro).toMatchObject({ price: 999, credits: 1000 })
    expect(TIER_CONFIG.premium).toMatchObject({ price: 2999, credits: 3000 })
    expect(TIER_CONFIG.ultra).toMatchObject({ price: 5999, credits: 6000 })
    for (const tier of ['free', 'pro', 'premium', 'ultra'] as const) {
      expect(TIER_CONFIG[tier]).not.toHaveProperty('bonus')
    }
  })

  it('sells extra credits at 1000 Credits for $10', () => {
    expect(EXTRA_CREDITS).toMatchObject({ price: 1000, credits: 1000 })
    expect(EXTRA_CREDITS).not.toHaveProperty('bonus')
  })
})

describe('Worst-case profit after Stripe fees', () => {
  // A buyer who spends every Credit: Anthropic cost is at most Credits / 1.25, because
  // rounding up and the Minimum charge only ever charge more than cost x 1.25.
  // Stripe takes about 2.9% + $0.30 per charge.
  it.each([
    { name: 'Pro', plan: TIER_CONFIG.pro, expectedCents: 140 },
    { name: 'Premium', plan: TIER_CONFIG.premium, expectedCents: 482 },
    { name: 'Ultra', plan: TIER_CONFIG.ultra, expectedCents: 995 },
    { name: 'extra credits', plan: EXTRA_CREDITS, expectedCents: 141 },
  ])('$name keeps a profit of about $expectedCents cents', ({ plan, expectedCents }) => {
    const { stripeFeeCents, maxAnthropicCostCents, profitCents } = calculateWorstCaseProfit(plan)

    expect(stripeFeeCents).toBeCloseTo(plan.price * 0.029 + 30, 6)
    expect(maxAnthropicCostCents).toBe(plan.credits * 0.8)
    expect(profitCents).toBeGreaterThanOrEqual(0)
    expect(profitCents).toBeCloseTo(expectedCents, 0)
  })
})

describe('Every Turn is profitable', () => {
  it('charges more than Anthropic cost for every model', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      const pricing = MODEL_PRICING[model]
      const tokens = 10000

      const rawCostUSD = (tokens / 1_000_000) * pricing.input + (tokens / 1_000_000) * pricing.output
      const rawCostCents = rawCostUSD * 100

      const chargedCredits = calculateCostInCredits(model, tokens, tokens)

      expect(chargedCredits).toBeGreaterThan(rawCostCents)
    }
  })
})

describe('Credit Calculation', () => {
  it('always charges at least 1 credit', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      const cost = calculateCostInCredits(model, 1, 1)
      expect(cost).toBeGreaterThanOrEqual(1)
    }
  })

  it('zero tokens still costs minimum 1 credit', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      const cost = calculateCostInCredits(model, 0, 0)
      expect(cost).toBe(1)
    }
  })

  it('more tokens = more credits', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      const small = calculateCostInCredits(model, 100, 100)
      const large = calculateCostInCredits(model, 100000, 100000)
      expect(large).toBeGreaterThan(small)
    }
  })

  it('expensive models cost more credits for same tokens', () => {
    const models = Object.keys(MODEL_PRICING) as ModelName[]
    const tokens = 10000

    const costs = models.map(model => ({
      model,
      cost: calculateCostInCredits(model, tokens, tokens),
      pricing: MODEL_PRICING[model].input + MODEL_PRICING[model].output,
    }))

    costs.sort((a, b) => a.pricing - b.pricing)

    for (let i = 1; i < costs.length; i++) {
      expect(costs[i].cost).toBeGreaterThan(costs[i - 1].cost)
    }
  })

  it('throws for unknown model', () => {
    expect(() => calculateCostInCredits('unknown-model' as ModelName, 100, 100))
      .toThrow('Unknown model')
  })
})

describe('TIER_CONFIG Structure', () => {
  it('has all required tiers', () => {
    expect(TIER_CONFIG).toHaveProperty('free')
    expect(TIER_CONFIG).toHaveProperty('pro')
    expect(TIER_CONFIG).toHaveProperty('premium')
    expect(TIER_CONFIG).toHaveProperty('ultra')
  })

  it('has increasing prices for higher tiers', () => {
    expect(TIER_CONFIG.pro.price).toBeGreaterThan(TIER_CONFIG.free.price)
    expect(TIER_CONFIG.premium.price).toBeGreaterThan(TIER_CONFIG.pro.price)
    expect(TIER_CONFIG.ultra.price).toBeGreaterThan(TIER_CONFIG.premium.price)
  })

  it('has increasing credits for higher tiers', () => {
    expect(TIER_CONFIG.pro.credits).toBeGreaterThan(TIER_CONFIG.free.credits)
    expect(TIER_CONFIG.premium.credits).toBeGreaterThan(TIER_CONFIG.pro.credits)
    expect(TIER_CONFIG.ultra.credits).toBeGreaterThan(TIER_CONFIG.premium.credits)
  })

  it('all tiers have access to all models (balance-only system)', () => {
    // All tiers have access to all models - credits are the only limit
    // This is verified by the existence of ALL_MODELS constant
    expect(ALL_MODELS).toBeDefined()
    expect(ALL_MODELS.length).toBe(3)
  })

  it('all available models exist in MODEL_PRICING', () => {
    for (const model of ALL_MODELS) {
      expect(MODEL_PRICING).toHaveProperty(model)
    }
  })
})

describe('MODEL_PRICING Structure', () => {
  it('has all required models', () => {
    const models = Object.keys(MODEL_PRICING)
    expect(models.length).toBeGreaterThanOrEqual(3)
  })

  it('all models have input and output pricing', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      expect(MODEL_PRICING[model]).toHaveProperty('input')
      expect(MODEL_PRICING[model]).toHaveProperty('output')
      expect(MODEL_PRICING[model].input).toBeGreaterThan(0)
      expect(MODEL_PRICING[model].output).toBeGreaterThan(0)
    }
  })

  it('output tokens cost more than input tokens', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      expect(MODEL_PRICING[model].output).toBeGreaterThan(MODEL_PRICING[model].input)
    }
  })
})

describe('calculateCostInCents (legacy alias)', () => {
  it('returns same value as calculateCostInCredits', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      const credits = calculateCostInCredits(model, 10000, 10000)
      const cents = calculateCostInCents(model, 10000, 10000)
      expect(credits).toBe(cents)
    }
  })
})

describe('Model Pricing Table', () => {
  it('prices the current Claude models at published rates', () => {
    expect(MODEL_PRICING['claude-haiku-5-5']).toEqual({
      input: 0.1,
      output: 0.5,
      cacheWrite: 0.125,
      cacheRead: 0.01,
      longPrompt: { thresholdTokens: 100_000, input: 0.5, output: 2.5, cacheWrite: 0.625, cacheRead: 0.05 },
    })
    expect(MODEL_PRICING['claude-sonnet-5-5']).toEqual({ input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.1 })
    expect(MODEL_PRICING['claude-opus-5-5']).toEqual({ input: 4.0, output: 20.0, cacheWrite: 5.0, cacheRead: 0.2 })
  })

  it('ALL_MODELS matches the shared model constants', () => {
    expect([...ALL_MODELS].sort()).toEqual(Object.values(CLAUDE_MODELS).sort())
  })

  it('every selectable model has a price', () => {
    for (const model of Object.values(CLAUDE_MODELS)) {
      expect(MODEL_PRICING).toHaveProperty(model)
    }
  })

  it('every legacy alias resolves to a priced model', () => {
    for (const legacy of Object.keys(LEGACY_MODEL_ALIASES)) {
      const resolved = resolveAgentModel(legacy)
      expect(MODEL_PRICING).toHaveProperty(resolved)
    }
  })

  it('carries no retired model ids', () => {
    for (const model of Object.keys(MODEL_PRICING)) {
      expect(model).not.toMatch(/-4-6$/)
      expect(model).not.toMatch(/\d{8}$/)
    }
  })
})

describe('Web Search Cost Accounting', () => {
  it('prices web search at the published $10 per 1,000 searches', () => {
    expect(WEB_SEARCH_PRICE_PER_1K_USD).toBe(10)
    expect(WEB_SEARCH_PRICE_PER_SEARCH_USD).toBeCloseTo(0.01, 10)
  })

  it('adds nothing when no searches ran', () => {
    const withoutSearch = calculateCostInCredits('claude-sonnet-5-5', 1000, 500)
    const explicitZero = calculateCostInCredits('claude-sonnet-5-5', 1000, 500, 0)
    expect(explicitZero).toBe(withoutSearch)
    expect(calculateWebSearchCostInCredits(0)).toBe(0)
  })

  it('charges more when searches ran', () => {
    const withoutSearch = calculateCostInCredits('claude-sonnet-5-5', 1000, 500, 0)
    const withSearch = calculateCostInCredits('claude-sonnet-5-5', 1000, 500, 3)
    expect(withSearch).toBeGreaterThan(withoutSearch)
  })

  it('charges the marked-up search fee, never less than raw cost', () => {
    for (const searches of [1, 2, 5, 25]) {
      const rawCents = searches * WEB_SEARCH_PRICE_PER_SEARCH_USD * 100
      expect(calculateWebSearchCostInCredits(searches)).toBeGreaterThanOrEqual(
        Math.ceil(rawCents)
      )
    }
  })

  it('total credits cover raw tokens plus raw searches', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      const searches = 4
      const inputTokens = 20000
      const outputTokens = 8000
      const rawUSD =
        (inputTokens / 1_000_000) * MODEL_PRICING[model].input +
        (outputTokens / 1_000_000) * MODEL_PRICING[model].output +
        searches * WEB_SEARCH_PRICE_PER_SEARCH_USD

      const charged = calculateCostInCredits(model, inputTokens, outputTokens, searches)
      expect(charged).toBeGreaterThan(rawUSD * 100)
    }
  })

  it('scales linearly with search count', () => {
    const one = calculateWebSearchCostInCredits(100)
    const two = calculateWebSearchCostInCredits(200)
    expect(two).toBe(one * 2)
  })

  it('ignores a negative search count instead of crediting the user', () => {
    const baseline = calculateCostInCredits('claude-opus-5-5', 1000, 500, 0)
    expect(calculateCostInCredits('claude-opus-5-5', 1000, 500, -5)).toBe(baseline)
  })

  it('legacy alias resolves to the same cost as the model actually called', () => {
    for (const [legacy, current] of Object.entries(LEGACY_MODEL_ALIASES)) {
      const viaAlias = calculateCostInCredits(
        resolveAgentModel(legacy) as ModelName,
        10000,
        5000,
        2
      )
      const direct = calculateCostInCredits(current as ModelName, 10000, 5000, 2)
      expect(viaAlias).toBe(direct)
    }
  })

  it('calculateCostInCents forwards the search count', () => {
    expect(calculateCostInCents('claude-opus-5-5', 1000, 500, 3)).toBe(
      calculateCostInCredits('claude-opus-5-5', 1000, 500, 3)
    )
  })
})

describe('calculateUsageCostInCredits (prompt-cache-aware billing)', () => {
  const noUsage = {
    inputTokens: 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens: 0,
  }

  it('charges Opus 5.5 cache reads at $0.20/MTok, not the base input rate', () => {
    // 1M x $0.20 = $0.20 -> x1.25 = 25 credits
    expect(
      calculateUsageCostInCredits('claude-opus-5-5', { ...noUsage, cacheReadInputTokens: 1_000_000 })
    ).toBe(25)
  })

  it('charges Sonnet 5.5 cache reads at $0.10/MTok (0.05x input)', () => {
    // 1M x $0.10 = $0.10 -> x1.25 = 12.5 -> 13 credits
    expect(
      calculateUsageCostInCredits('claude-sonnet-5-5', { ...noUsage, cacheReadInputTokens: 1_000_000 })
    ).toBe(13)
  })

  it('charges 5-minute cache writes at 1.25x input: Sonnet $2.50, Opus $5.00 per MTok', () => {
    const write = { ...noUsage, cacheCreationInputTokens: 1_000_000 }
    // $2.50 -> x1.25 = 312.5 -> 313; $5.00 -> x1.25 = 625
    expect(calculateUsageCostInCredits('claude-sonnet-5-5', write)).toBe(313)
    expect(calculateUsageCostInCredits('claude-opus-5-5', write)).toBe(625)
  })

  const cachedAgentTurn = {
    inputTokens: 1_000,
    cacheCreationInputTokens: 2_000,
    cacheReadInputTokens: 100_000,
    outputTokens: 500,
  }

  it('bills every input bucket plus output on Sonnet 5.5', () => {
    // $0.002 input + $0.005 write + $0.01 read + $0.005 output = $0.022 -> x1.25 = 2.75 -> 3
    expect(calculateUsageCostInCredits('claude-sonnet-5-5', cachedAgentTurn)).toBe(3)
  })

  it('bills every input bucket plus output on Opus 5.5', () => {
    // $0.004 input + $0.01 write + $0.02 read + $0.01 output = $0.044 -> x1.25 = 5.5 -> 6
    expect(calculateUsageCostInCredits('claude-opus-5-5', cachedAgentTurn)).toBe(6)
  })

  it('adds the per-search fee on top of cached tokens', () => {
    // $0.044 tokens + 2 x $0.01 searches = $0.064 -> x1.25 = 8
    expect(
      calculateUsageCostInCredits('claude-opus-5-5', { ...cachedAgentTurn, webSearchRequests: 2 })
    ).toBe(8)
  })
})

describe('Haiku 5.5 prompt-length rate cards', () => {
  const usage = (promptTokens: number, outputTokens: number) => ({
    inputTokens: promptTokens,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    outputTokens,
  })

  it('bills a prompt of up to 100K tokens at $0.10 / $0.50', () => {
    // 100K x $0.10 + 100K x $0.50 = $0.06 -> x1.25 = 7.5 -> 8
    expect(calculateUsageCostInCredits('claude-haiku-5-5', usage(100_000, 100_000))).toBe(8)
  })

  it('bills the whole request, output included, at $0.50 / $2.50 once the prompt passes 100K', () => {
    // 200K x $0.50 + 100K x $2.50 = $0.35 -> x1.25 = 43.75 -> 44
    expect(calculateUsageCostInCredits('claude-haiku-5-5', usage(200_000, 100_000))).toBe(44)
  })

  it('counts cached tokens toward the 100K threshold', () => {
    const cachedLongPrompt = {
      inputTokens: 1_000,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 1_000_000,
      outputTokens: 0,
    }
    // $0.0005 input + 1M x $0.05 read = $0.0505 -> x1.25 = 6.31 -> 7 (short card would be 2)
    expect(calculateUsageCostInCredits('claude-haiku-5-5', cachedLongPrompt)).toBe(7)
  })

  it('a typical cached agent turn costs the 1-credit minimum', () => {
    expect(calculateUsageCostInCredits('claude-haiku-5-5', {
      inputTokens: 1_000,
      cacheCreationInputTokens: 2_000,
      cacheReadInputTokens: 20_000,
      outputTokens: 500,
    })).toBe(1)
  })
})

describe('formatCreditsAsDollars', () => {
  it.each([
    [7, '$0.07'],
    [1000, '$10'],
    [6000, '$60'],
    [1050, '$10.50'],
  ])('shows %i Credits as %s', (credits, dollars) => {
    expect(formatCreditsAsDollars(credits)).toBe(dollars)
  })
})
