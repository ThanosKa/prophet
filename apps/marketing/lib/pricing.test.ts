import { describe, it, expect } from 'vitest'
import {
  calculateCostInCredits,
  calculateCostInCents,
  TIER_CONFIG,
  MODEL_PRICING,
  MARKUP,
  ALL_MODELS,
  WEB_SEARCH_PRICE_PER_1K_USD,
  WEB_SEARCH_PRICE_PER_SEARCH_USD,
  calculateWebSearchCostInCredits,
  calculateUsageCostInCredits,
  type ModelName,
} from './pricing'
import { CLAUDE_MODELS, LEGACY_MODEL_ALIASES, resolveAgentModel } from '@prophet/shared'

describe('Profitability Guarantee', () => {
  it('all paid tiers are profitable even at 100% usage', () => {
    for (const tier of ['pro', 'premium', 'ultra'] as const) {
      const config = TIER_CONFIG[tier]
      const revenue = config.price
      const maxCost = config.credits / MARKUP
      const profit = revenue - maxCost

      expect(profit).toBeGreaterThan(0)
    }
  })

  it('markup is high enough to cover all bonuses', () => {
    for (const tier of ['pro', 'premium', 'ultra'] as const) {
      const config = TIER_CONFIG[tier]
      const baseCredits = config.price
      const totalCredits = config.credits
      const bonusPercent = ((totalCredits - baseCredits) / baseCredits) * 100
      const markupPercent = (MARKUP - 1) * 100

      expect(markupPercent).toBeGreaterThan(bonusPercent)
    }
  })

  it('every API call generates profit (markup applied)', () => {
    for (const model of Object.keys(MODEL_PRICING) as ModelName[]) {
      const pricing = MODEL_PRICING[model]
      const tokens = 10000

      const rawCostUSD = (tokens / 1_000_000) * pricing.input + (tokens / 1_000_000) * pricing.output
      const rawCostCents = Math.ceil(rawCostUSD * 100)

      const chargedCredits = calculateCostInCredits(model, tokens, tokens)

      expect(chargedCredits).toBeGreaterThan(rawCostCents)
    }
  })

  it('higher tiers get better or equal bonuses', () => {
    expect(TIER_CONFIG.pro.bonus).toBeGreaterThan(TIER_CONFIG.free.bonus)
    expect(TIER_CONFIG.premium.bonus).toBeGreaterThanOrEqual(TIER_CONFIG.pro.bonus)
    expect(TIER_CONFIG.ultra.bonus).toBeGreaterThanOrEqual(TIER_CONFIG.premium.bonus)
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

describe('Markup Validation', () => {
  it('markup is at least 20%', () => {
    expect(MARKUP).toBeGreaterThanOrEqual(1.20)
  })

  it('markup is reasonable (not excessive)', () => {
    expect(MARKUP).toBeLessThanOrEqual(1.50)
  })
})

describe('Business Model Invariants', () => {
  it('free tier has zero price', () => {
    expect(TIER_CONFIG.free.price).toBe(0)
  })

  it('paid tiers give more value than price (bonus credits)', () => {
    for (const tier of ['pro', 'premium', 'ultra'] as const) {
      const config = TIER_CONFIG[tier]
      expect(config.credits).toBeGreaterThanOrEqual(config.price)
    }
  })

  it('profit margin is positive for all paid tiers at 100% usage', () => {
    for (const tier of ['pro', 'premium', 'ultra'] as const) {
      const config = TIER_CONFIG[tier]
      const revenue = config.price / 100
      const apiCostIfAllUsed = config.credits / 100 / MARKUP
      const profit = revenue - apiCostIfAllUsed

      expect(profit).toBeGreaterThan(0)
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
    expect(MODEL_PRICING['claude-haiku-4-5']).toEqual({ input: 1.0, output: 5.0, cacheWrite: 1.25, cacheRead: 0.1 })
    expect(MODEL_PRICING['claude-sonnet-5-5']).toEqual({ input: 2.0, output: 10.0, cacheWrite: 2.5, cacheRead: 0.2 })
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
    // 1M x $0.20 = $0.20 -> x1.2 = 24 credits
    expect(
      calculateUsageCostInCredits('claude-opus-5-5', { ...noUsage, cacheReadInputTokens: 1_000_000 })
    ).toBe(24)
  })

  it('charges Sonnet 5.5 cache reads at $0.20/MTok (0.1x input)', () => {
    expect(
      calculateUsageCostInCredits('claude-sonnet-5-5', { ...noUsage, cacheReadInputTokens: 1_000_000 })
    ).toBe(24)
  })

  it('charges Haiku 4.5 cache reads at $0.10/MTok (0.1x input)', () => {
    // 1M x $0.10 = $0.10 -> x1.2 = 12 credits
    expect(
      calculateUsageCostInCredits('claude-haiku-4-5', { ...noUsage, cacheReadInputTokens: 1_000_000 })
    ).toBe(12)
  })

  it('charges 5-minute cache writes at 1.25x input: Haiku $1.25, Sonnet $2.50, Opus $5.00 per MTok', () => {
    const write = { ...noUsage, cacheCreationInputTokens: 1_000_000 }
    expect(calculateUsageCostInCredits('claude-haiku-4-5', write)).toBe(150)
    expect(calculateUsageCostInCredits('claude-sonnet-5-5', write)).toBe(300)
    expect(calculateUsageCostInCredits('claude-opus-5-5', write)).toBe(600)
  })

  const cachedAgentTurn = {
    inputTokens: 1_000,
    cacheCreationInputTokens: 2_000,
    cacheReadInputTokens: 100_000,
    outputTokens: 500,
  }

  it('bills every input bucket plus output on Sonnet 5.5', () => {
    // $0.002 input + $0.005 write + $0.02 read + $0.005 output = $0.032 -> x1.2 = 3.84 -> 4
    expect(calculateUsageCostInCredits('claude-sonnet-5-5', cachedAgentTurn)).toBe(4)
  })

  it('bills every input bucket plus output on Opus 5.5', () => {
    // $0.004 input + $0.01 write + $0.02 read + $0.01 output = $0.044 -> x1.2 = 5.28 -> 6
    expect(calculateUsageCostInCredits('claude-opus-5-5', cachedAgentTurn)).toBe(6)
  })

  it('adds the per-search fee on top of cached tokens', () => {
    // $0.044 tokens + 2 x $0.01 searches = $0.064 -> x1.2 = 7.68 -> 8
    expect(
      calculateUsageCostInCredits('claude-opus-5-5', { ...cachedAgentTurn, webSearchRequests: 2 })
    ).toBe(8)
  })
})
