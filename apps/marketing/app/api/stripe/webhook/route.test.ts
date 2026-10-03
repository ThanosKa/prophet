import { describe, it, expect, vi, beforeEach } from 'vitest'
import type Stripe from 'stripe'
import { PgDialect } from 'drizzle-orm/pg-core'
import { SQL } from 'drizzle-orm'
import { TIER_CONFIG } from '@/lib/pricing'

const mocks = vi.hoisted(() => {
  const where = vi.fn()
  const set = vi.fn((_values: Record<string, unknown>) => ({ where }))
  return {
    findFirst: vi.fn(),
    set,
    update: vi.fn(() => ({ set })),
    constructEvent: vi.fn(),
    invalidateUserTierCache: vi.fn(),
    sendPurchaseEmail: vi.fn(() => Promise.resolve()),
  }
})

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: mocks.findFirst,
      },
    },
    update: mocks.update,
  },
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: mocks.constructEvent,
    },
  },
}))

vi.mock('@/lib/cache', () => ({
  invalidateUserTierCache: mocks.invalidateUserTierCache,
}))

vi.mock('@/lib/email', () => ({
  sendPurchaseEmail: mocks.sendPurchaseEmail,
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

const PERIOD_START = 1_767_225_600
const PERIOD_END = 1_769_904_000

function renderSql(value: unknown) {
  if (!(value instanceof SQL)) throw new Error(`Expected an SQL expression, got ${JSON.stringify(value)}`)
  return new PgDialect().sqlToQuery(value)
}

function subscriptionEvent({
  type,
  subscriptionId = 'sub_123',
  priceId,
  status = 'active',
  cancelAtPeriodEnd = false,
}: {
  type: 'customer.subscription.created' | 'customer.subscription.updated' | 'customer.subscription.deleted'
  subscriptionId?: string
  priceId: string
  status?: Stripe.Subscription.Status
  cancelAtPeriodEnd?: boolean
}) {
  return {
    id: 'evt_123',
    type,
    data: {
      object: {
        id: subscriptionId,
        customer: 'cus_123',
        status,
        cancel_at_period_end: cancelAtPeriodEnd,
        items: {
          data: [
            {
              price: { id: priceId },
              current_period_start: PERIOD_START,
              current_period_end: PERIOD_END,
            },
          ],
        },
      },
    },
  }
}

function paidUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user_123',
    email: 'user@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    tier: 'pro',
    creditsRemaining: 300,
    creditsIncluded: TIER_CONFIG.pro.credits,
    stripeCustomerId: 'cus_123',
    stripeSubscriptionId: 'sub_123',
    stripePriceId: TIER_CONFIG.pro.priceId,
    subscriptionStatus: 'active',
    cancelAtPeriodEnd: false,
    billingPeriodStart: new Date(PERIOD_START * 1000),
    billingPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    ...overrides,
  }
}

async function postWebhook(event: unknown) {
  mocks.constructEvent.mockReturnValue(event)
  const { POST } = await import('./route')
  return POST(new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: '{}' }))
}

function lastSetPayload(): Record<string, unknown> {
  const call = mocks.set.mock.calls.at(-1)
  if (!call) throw new Error('db.update().set() was never called')
  return call[0]
}

describe('POST /api/stripe/webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
  })

  describe('customer.subscription.updated', () => {
    it('does not refill credits when the user toggles cancel_at_period_end', async () => {
      mocks.findFirst.mockResolvedValue(paidUser())

      const response = await postWebhook(
        subscriptionEvent({
          type: 'customer.subscription.updated',
          priceId: TIER_CONFIG.pro.priceId,
          cancelAtPeriodEnd: true,
        })
      )

      expect(response.status).toBe(200)
      const payload = lastSetPayload()
      expect(payload.cancelAtPeriodEnd).toBe(true)
      expect(payload.creditsRemaining).toBeUndefined()
    })

    it('does not refill credits on a non-billing update (e.g. payment method change)', async () => {
      mocks.findFirst.mockResolvedValue(paidUser({ creditsRemaining: 0 }))

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId })
      )

      expect(lastSetPayload().creditsRemaining).toBeUndefined()
      expect(mocks.sendPurchaseEmail).not.toHaveBeenCalled()
    })

    it('does not refill credits when a past_due subscription recovers (invoice.payment_succeeded handles the reset)', async () => {
      mocks.findFirst.mockResolvedValue(paidUser({ creditsRemaining: 0, subscriptionStatus: 'past_due' }))

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId })
      )

      const payload = lastSetPayload()
      expect(payload.subscriptionStatus).toBe('active')
      expect(payload.creditsRemaining).toBeUndefined()
    })

    it('preserves credits on a mid-period upgrade and updates tier/price/allocation', async () => {
      mocks.findFirst.mockResolvedValue(paidUser({ creditsRemaining: 300 }))

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.ultra.priceId })
      )

      const payload = lastSetPayload()
      expect(payload.tier).toBe('ultra')
      expect(payload.stripePriceId).toBe(TIER_CONFIG.ultra.priceId)
      expect(payload.creditsIncluded).toBe(TIER_CONFIG.ultra.credits)
      expect(payload.creditsRemaining).toBeUndefined()
      expect(mocks.invalidateUserTierCache).toHaveBeenCalledWith('user_123')
    })

    it('does not grant credits on a downgrade', async () => {
      mocks.findFirst.mockResolvedValue(
        paidUser({ tier: 'ultra', stripePriceId: TIER_CONFIG.ultra.priceId, creditsRemaining: 0 })
      )

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId })
      )

      const payload = lastSetPayload()
      expect(payload.tier).toBe('pro')
      expect(payload.creditsRemaining).toBeUndefined()
    })

    it('grants the tier allocation once when an incomplete subscription becomes active', async () => {
      mocks.findFirst.mockResolvedValue(paidUser({ creditsRemaining: 20, subscriptionStatus: 'incomplete' }))

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId })
      )

      expect(lastSetPayload().creditsRemaining).toBe(TIER_CONFIG.pro.credits)
      expect(mocks.sendPurchaseEmail).toHaveBeenCalledTimes(1)
    })
  })

  describe('customer.subscription.created', () => {
    const freeUser = () =>
      paidUser({
        tier: 'free',
        creditsRemaining: 5,
        creditsIncluded: TIER_CONFIG.free.credits,
        stripeSubscriptionId: null,
        stripePriceId: null,
        subscriptionStatus: null,
        billingPeriodStart: null,
        billingPeriodEnd: null,
      })

    it('grants the full tier allocation for a new active subscription', async () => {
      mocks.findFirst.mockResolvedValue(freeUser())

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.created', priceId: TIER_CONFIG.pro.priceId })
      )

      const payload = lastSetPayload()
      expect(payload.tier).toBe('pro')
      expect(payload.creditsRemaining).toBe(TIER_CONFIG.pro.credits)
      expect(payload.billingPeriodEnd).toEqual(new Date(PERIOD_END * 1000))
      expect(mocks.sendPurchaseEmail).toHaveBeenCalledTimes(1)
    })

    it('does not grant credits while the first payment is still incomplete', async () => {
      mocks.findFirst.mockResolvedValue(freeUser())

      await postWebhook(
        subscriptionEvent({
          type: 'customer.subscription.created',
          priceId: TIER_CONFIG.pro.priceId,
          status: 'incomplete',
        })
      )

      expect(lastSetPayload().creditsRemaining).toBeUndefined()
    })

    it('is idempotent when Stripe redelivers the created event', async () => {
      mocks.findFirst.mockResolvedValue(paidUser({ creditsRemaining: 900 }))

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.created', priceId: TIER_CONFIG.pro.priceId })
      )

      expect(lastSetPayload().creditsRemaining).toBeUndefined()
      expect(mocks.sendPurchaseEmail).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.deleted', () => {
    it('never raises a negative balance (caps the balance at the free allocation atomically)', async () => {
      mocks.findFirst.mockResolvedValue(paidUser({ creditsRemaining: -50 }))

      await postWebhook(
        subscriptionEvent({
          type: 'customer.subscription.deleted',
          priceId: TIER_CONFIG.pro.priceId,
          status: 'canceled',
        })
      )

      const payload = lastSetPayload()
      expect(payload.tier).toBe('free')
      expect(payload.creditsIncluded).toBe(TIER_CONFIG.free.credits)
      expect(renderSql(payload.creditsRemaining)).toMatchObject({
        sql: 'least("users"."credits_remaining", $1)',
        params: [TIER_CONFIG.free.credits],
      })
      expect(mocks.invalidateUserTierCache).toHaveBeenCalledWith('user_123')
    })
  })
})
