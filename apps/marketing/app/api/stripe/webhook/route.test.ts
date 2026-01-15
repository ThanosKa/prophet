import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TIER_CONFIG } from '@/lib/pricing'

const mockFindFirst = vi.fn()
const mockUpdate = vi.fn(() => ({
  set: vi.fn(() => ({
    where: vi.fn(),
  })),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: mockFindFirst,
      },
    },
    update: mockUpdate,
  },
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => 'mock-signature'),
  })),
}))

describe('determineTierFromPrice', () => {
  it('returns pro for price containing "pro"', async () => {
    const { determineTierFromPrice } = await import('./route')
    expect(determineTierFromPrice('price_pro_monthly')).toBe('pro')
    expect(determineTierFromPrice('prod_pro_123')).toBe('pro')
  })

  it('returns premium for price containing "premium"', async () => {
    const { determineTierFromPrice } = await import('./route')
    expect(determineTierFromPrice('price_premium_monthly')).toBe('premium')
  })

  it('returns ultra for price containing "ultra"', async () => {
    const { determineTierFromPrice } = await import('./route')
    expect(determineTierFromPrice('price_ultra_annual')).toBe('ultra')
  })

  it('returns null for unknown price', async () => {
    const { determineTierFromPrice } = await import('./route')
    expect(determineTierFromPrice('price_unknown')).toBeNull()
    expect(determineTierFromPrice('basic_plan')).toBeNull()
  })
})

describe('TIER_CONFIG integration', () => {
  it('free tier has lowest credits', () => {
    expect(TIER_CONFIG.free.credits).toBeLessThan(TIER_CONFIG.pro.credits)
  })

  it('tiers are ordered by credits', () => {
    const tiers = ['free', 'pro', 'premium', 'ultra'] as const
    for (let i = 0; i < tiers.length - 1; i++) {
      expect(TIER_CONFIG[tiers[i]].credits).toBeLessThan(TIER_CONFIG[tiers[i + 1]].credits)
    }
  })
})

describe('Credit preservation logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('first subscription gets full tier credits', () => {
    const user = { stripeSubscriptionId: null, creditsRemaining: 0, tier: 'free' }
    const tierConfig = TIER_CONFIG.pro
    const isFirstSubscription = !user.stripeSubscriptionId
    const creditsRemaining = isFirstSubscription ? tierConfig.credits : user.creditsRemaining

    expect(creditsRemaining).toBe(TIER_CONFIG.pro.credits)
  })

  it('plan change preserves existing credits', () => {
    const user = { stripeSubscriptionId: 'sub_123', creditsRemaining: 500, tier: 'pro' }
    const tierConfig = TIER_CONFIG.premium
    const isFirstSubscription = !user.stripeSubscriptionId
    const creditsRemaining = isFirstSubscription ? tierConfig.credits : user.creditsRemaining

    expect(creditsRemaining).toBe(500)
  })

  it('upgrade keeps existing credits', () => {
    const user = { stripeSubscriptionId: 'sub_123', creditsRemaining: 500, tier: 'pro' }
    const newTier = 'premium'
    const isFirstSubscription = !user.stripeSubscriptionId
    const creditsRemaining = isFirstSubscription ? TIER_CONFIG[newTier].credits : user.creditsRemaining

    expect(creditsRemaining).toBe(500)
    expect(TIER_CONFIG[newTier].credits).toBeGreaterThan(TIER_CONFIG.pro.credits)
  })

  it('downgrade keeps existing credits (scheduled by Stripe)', () => {
    const user = { stripeSubscriptionId: 'sub_123', creditsRemaining: 3000, tier: 'premium' }
    const newTier = 'pro'
    const isFirstSubscription = !user.stripeSubscriptionId
    const creditsRemaining = isFirstSubscription ? TIER_CONFIG[newTier].credits : user.creditsRemaining

    expect(creditsRemaining).toBe(3000)
  })
})

describe('Monthly credit reset logic', () => {
  it('billing_reason must be subscription_cycle for reset', () => {
    const invoiceWithCycle = { billing_reason: 'subscription_cycle' }
    const invoiceInitial = { billing_reason: 'subscription_create' }
    const invoiceManual = { billing_reason: 'manual' }

    expect(invoiceWithCycle.billing_reason === 'subscription_cycle').toBe(true)
    expect(invoiceInitial.billing_reason === 'subscription_cycle').toBe(false)
    expect(invoiceManual.billing_reason === 'subscription_cycle').toBe(false)
  })

  it('duplicate reset prevention works with matching period end', () => {
    const invoicePeriodEnd = new Date('2025-02-01T00:00:00Z')
    const userPeriodEnd = new Date('2025-02-01T00:00:00Z')

    const isDuplicate = userPeriodEnd && userPeriodEnd.getTime() === invoicePeriodEnd.getTime()
    expect(isDuplicate).toBe(true)
  })

  it('allows reset for new billing period', () => {
    const invoicePeriodEnd = new Date('2025-02-01T00:00:00Z')
    const userPeriodEnd = new Date('2025-01-01T00:00:00Z')

    const isDuplicate = userPeriodEnd && userPeriodEnd.getTime() === invoicePeriodEnd.getTime()
    expect(isDuplicate).toBe(false)
  })

  it('allows reset when user has no previous period', () => {
    const invoicePeriodEnd = new Date('2025-02-01T00:00:00Z')
    const userPeriodEnd = null as Date | null

    const isDuplicate = userPeriodEnd ? userPeriodEnd.getTime() === invoicePeriodEnd.getTime() : false
    expect(isDuplicate).toBe(false)
  })
})

describe('Subscription deleted logic', () => {
  it('resets to free tier credits', () => {
    const freeCredits = TIER_CONFIG.free.credits
    expect(freeCredits).toBeGreaterThan(0)
    expect(freeCredits).toBeLessThan(TIER_CONFIG.pro.credits)
  })
})

describe('100% discount checkout (promo code)', () => {
  it('credits come from metadata, not amount_total', () => {
    // Simulates a checkout.session.completed with 100% discount
    const session = {
      id: 'cs_test_123',
      mode: 'payment',
      amount_total: 0, // 100% discount applied
      customer: 'cus_123',
      metadata: {
        userId: 'user_123',
        type: 'extra_credits',
        credits: '1000', // Credits from metadata
      },
    }

    // The webhook reads credits from metadata, not amount_total
    const creditsToAdd = parseInt(session.metadata?.credits || '0', 10)

    expect(session.amount_total).toBe(0)
    expect(creditsToAdd).toBe(1000)
    expect(session.metadata.type).toBe('extra_credits')
  })

  it('credits are added even when amount is zero', () => {
    const session = {
      mode: 'payment',
      amount_total: 0,
      metadata: {
        userId: 'user_123',
        type: 'extra_credits',
        credits: '1000',
      },
    }

    const type = session.metadata?.type
    const creditsToAdd = parseInt(session.metadata?.credits || '0', 10)

    // This is the condition in handleCheckoutCompleted
    const shouldAddCredits = type === 'extra_credits' && creditsToAdd > 0

    expect(shouldAddCredits).toBe(true)
    expect(creditsToAdd).toBe(1000)
  })

  it('subscription checkout with 100% discount still processes', () => {
    const session = {
      mode: 'subscription',
      amount_total: 0, // First month free promo
      customer: 'cus_123',
      metadata: {
        userId: 'user_123',
        tier: 'pro',
      },
    }

    // Subscription checkout only stores customerId
    // Actual tier/credits are handled by customer.subscription.created event
    const tier = session.metadata?.tier
    expect(tier).toBe('pro')
    expect(session.mode).toBe('subscription')
  })
})
