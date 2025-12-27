import { describe, it, expect } from 'vitest'
import {
  calculateCostInCredits,
  calculateCostInCents,
  TIER_CONFIG,
  MODEL_PRICING,
  MARKUP,
  type ModelName,
} from './pricing'

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

  it('higher tiers unlock more models', () => {
    expect(TIER_CONFIG.pro.models.length).toBeGreaterThanOrEqual(TIER_CONFIG.free.models.length)
    expect(TIER_CONFIG.premium.models.length).toBeGreaterThanOrEqual(TIER_CONFIG.pro.models.length)
    expect(TIER_CONFIG.ultra.models.length).toBeGreaterThanOrEqual(TIER_CONFIG.premium.models.length)
  })

  it('all tier models exist in MODEL_PRICING', () => {
    for (const tier of Object.values(TIER_CONFIG)) {
      for (const model of tier.models) {
        expect(MODEL_PRICING).toHaveProperty(model)
      }
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
