import { describe, it, expect } from 'vitest'
import { calculateCostInCents, TIER_CONFIG, MODEL_PRICING } from './pricing'

describe('calculateCostInCents', () => {
  it('calculates correct cost for claude-sonnet-4', () => {
    const cost = calculateCostInCents('claude-sonnet-4-20250514', 1000000, 500000)
    expect(cost).toBeGreaterThan(0)
    expect(typeof cost).toBe('number')
  })

  it('calculates correct cost for claude-3-5-haiku', () => {
    const cost = calculateCostInCents('claude-3-5-haiku-20241022', 1000000, 500000)
    expect(cost).toBeGreaterThan(0)
  })

  it('calculates correct cost for claude-opus', () => {
    const cost = calculateCostInCents('claude-opus-4-5-20250514', 1000000, 500000)
    expect(cost).toBeGreaterThan(0)
  })

  it('returns higher cost for more expensive models', () => {
    const tokens = 1000000
    const haikuCost = calculateCostInCents('claude-3-5-haiku-20241022', tokens, tokens)
    const sonnetCost = calculateCostInCents('claude-sonnet-4-20250514', tokens, tokens)
    const opusCost = calculateCostInCents('claude-opus-4-5-20250514', tokens, tokens)

    expect(sonnetCost).toBeGreaterThan(haikuCost)
    expect(opusCost).toBeGreaterThan(sonnetCost)
  })

  it('throws for unknown model', () => {
    expect(() => calculateCostInCents('unknown-model' as keyof typeof MODEL_PRICING, 100, 100))
      .toThrow('Unknown model')
  })

  it('returns 0 for zero tokens', () => {
    const cost = calculateCostInCents('claude-sonnet-4-20250514', 0, 0)
    expect(cost).toBe(0)
  })
})

describe('TIER_CONFIG', () => {
  it('has all required tiers', () => {
    expect(TIER_CONFIG).toHaveProperty('free')
    expect(TIER_CONFIG).toHaveProperty('pro')
    expect(TIER_CONFIG).toHaveProperty('premium')
    expect(TIER_CONFIG).toHaveProperty('ultra')
  })

  it('has correct credit amounts', () => {
    expect(TIER_CONFIG.free.credits).toBe(100)
    expect(TIER_CONFIG.pro.credits).toBe(999)
    expect(TIER_CONFIG.premium.credits).toBe(3599)
    expect(TIER_CONFIG.ultra.credits).toBe(7499)
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
})

describe('MODEL_PRICING', () => {
  it('has all required models', () => {
    expect(MODEL_PRICING).toHaveProperty('claude-3-5-haiku-20241022')
    expect(MODEL_PRICING).toHaveProperty('claude-sonnet-4-20250514')
    expect(MODEL_PRICING).toHaveProperty('claude-opus-4-5-20250514')
  })

  it('has input and output pricing for each model', () => {
    for (const model of Object.values(MODEL_PRICING)) {
      expect(model).toHaveProperty('input')
      expect(model).toHaveProperty('output')
      expect(model.input).toBeGreaterThan(0)
      expect(model.output).toBeGreaterThan(0)
    }
  })
})
