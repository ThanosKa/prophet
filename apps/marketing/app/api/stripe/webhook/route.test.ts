import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type Stripe from 'stripe'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { eq, sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { TIER_CONFIG } from '@/lib/pricing'
import { POST, determineTierFromPrice } from './route'

vi.mock('@/lib/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dbSchema = await import('@/lib/db/schema')
  return { db: drizzle(new PGlite(), { schema: dbSchema }) }
})

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  invalidateUserTierCache: vi.fn(),
  sendPurchaseEmail: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent: mocks.constructEvent } },
}))
vi.mock('@/lib/cache', () => ({ invalidateUserTierCache: mocks.invalidateUserTierCache }))
vi.mock('@/lib/email', () => ({ sendPurchaseEmail: mocks.sendPurchaseEmail }))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({ get: vi.fn(() => 'mock-signature') })),
}))

const { db } = await import('@/lib/db')

const USER_ID = 'user_123'
const CUSTOMER_ID = 'cus_123'
const PERIOD_START = 1_767_225_600 // 2026-01-01
const PERIOD_END = 1_769_904_000 // 2026-02-01
const NEXT_PERIOD_END = 1_772_323_200 // 2026-03-01
const DAY_MS = 24 * 60 * 60 * 1000

beforeAll(async () => {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
  await db.delete(schema.users)
})

async function insertUser(values: Partial<schema.NewUser> = {}) {
  await db.insert(schema.users).values({ id: USER_ID, email: 'user@example.com', ...values })
}

async function insertProSubscriber(values: Partial<schema.NewUser> = {}) {
  await insertUser({
    firstName: 'Ada',
    lastName: 'Lovelace',
    tier: 'pro',
    creditsRemaining: 300,
    purchasedCredits: 1000,
    creditsIncluded: TIER_CONFIG.pro.credits,
    stripeCustomerId: CUSTOMER_ID,
    stripeSubscriptionId: 'sub_123',
    stripePriceId: TIER_CONFIG.pro.priceId,
    subscriptionStatus: 'active',
    billingPeriodStart: new Date(PERIOD_START * 1000),
    billingPeriodEnd: new Date(Date.now() + 10 * DAY_MS),
    ...values,
  })
}

async function readUser() {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, USER_ID) })
  if (!user) throw new Error('user row missing')
  return user
}

async function balances() {
  const { creditsRemaining, purchasedCredits } = await readUser()
  return { subscriptionCredits: creditsRemaining, purchasedCredits }
}

async function postWebhook(event: unknown) {
  mocks.constructEvent.mockReturnValue(event)
  return POST(new Request('http://localhost/api/stripe/webhook', { method: 'POST', body: '{}' }))
}

function extraCreditsCheckoutEvent({ sessionId = 'cs_extra_1', credits = '1000' } = {}) {
  return {
    id: `evt_${sessionId}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        mode: 'payment',
        customer: CUSTOMER_ID,
        amount_total: 1000,
        metadata: { userId: USER_ID, type: 'extra_credits', credits },
      },
    },
  }
}

function subscriptionEvent({
  type,
  priceId,
  status = 'active',
  cancelAtPeriodEnd = false,
}: {
  type: 'customer.subscription.created' | 'customer.subscription.updated' | 'customer.subscription.deleted'
  priceId: string
  status?: Stripe.Subscription.Status
  cancelAtPeriodEnd?: boolean
}) {
  return {
    id: 'evt_sub',
    type,
    data: {
      object: {
        id: 'sub_123',
        customer: CUSTOMER_ID,
        status,
        cancel_at_period_end: cancelAtPeriodEnd,
        items: {
          data: [{ price: { id: priceId }, current_period_start: PERIOD_START, current_period_end: PERIOD_END }],
        },
      },
    },
  }
}

function renewalInvoiceEvent({ billingReason = 'subscription_cycle' } = {}) {
  return {
    id: 'evt_invoice',
    type: 'invoice.payment_succeeded',
    data: {
      object: {
        id: 'in_123',
        customer: CUSTOMER_ID,
        subscription: 'sub_123',
        billing_reason: billingReason,
        period_start: PERIOD_END,
        period_end: NEXT_PERIOD_END,
      },
    },
  }
}

describe('determineTierFromPrice', () => {
  it('matches configured price IDs and legacy names', () => {
    expect(determineTierFromPrice(TIER_CONFIG.premium.priceId)).toBe('premium')
    expect(determineTierFromPrice('price_pro_monthly')).toBe('pro')
    expect(determineTierFromPrice('price_ultra_annual')).toBe('ultra')
    expect(determineTierFromPrice('price_unknown')).toBeNull()
  })
})

describe('POST /api/stripe/webhook', () => {
  describe('checkout.session.completed for extra credits', () => {
    it('adds the bought Credits to Purchased credits only', async () => {
      await insertProSubscriber({ creditsRemaining: 300, purchasedCredits: 1000 })

      const response = await postWebhook(extraCreditsCheckoutEvent())

      expect(response.status).toBe(200)
      expect(await balances()).toEqual({ subscriptionCredits: 300, purchasedCredits: 2000 })
      expect(mocks.sendPurchaseEmail).toHaveBeenCalledTimes(1)
    })

    it('adds the Credits once when Stripe redelivers the same checkout session', async () => {
      await insertProSubscriber({ creditsRemaining: 300, purchasedCredits: 1000 })

      await postWebhook(extraCreditsCheckoutEvent({ sessionId: 'cs_extra_1' }))
      const redelivery = await postWebhook(extraCreditsCheckoutEvent({ sessionId: 'cs_extra_1' }))

      expect(redelivery.status).toBe(200)
      expect(await balances()).toEqual({ subscriptionCredits: 300, purchasedCredits: 2000 })
      expect(mocks.sendPurchaseEmail).toHaveBeenCalledTimes(1)
    })

    it('adds the Credits of each separate purchase', async () => {
      await insertProSubscriber({ creditsRemaining: 300, purchasedCredits: 1000 })

      await postWebhook(extraCreditsCheckoutEvent({ sessionId: 'cs_extra_1' }))
      await postWebhook(extraCreditsCheckoutEvent({ sessionId: 'cs_extra_2' }))

      expect(await balances()).toEqual({ subscriptionCredits: 300, purchasedCredits: 3000 })
    })

    it('gives a Free user Purchased credits and keeps the Free grant', async () => {
      await insertUser({ creditsRemaining: TIER_CONFIG.free.credits })

      await postWebhook(extraCreditsCheckoutEvent())

      expect(await balances()).toEqual({ subscriptionCredits: TIER_CONFIG.free.credits, purchasedCredits: 1000 })
      expect((await readUser()).stripeCustomerId).toBe(CUSTOMER_ID)
    })
  })

  describe('invoice.payment_succeeded (renewal)', () => {
    it('replaces Subscription credits with the plan amount and keeps Purchased credits', async () => {
      await insertProSubscriber({
        creditsRemaining: 40,
        purchasedCredits: 1000,
        billingPeriodEnd: new Date(PERIOD_END * 1000),
      })

      await postWebhook(renewalInvoiceEvent())

      expect(await balances()).toEqual({ subscriptionCredits: TIER_CONFIG.pro.credits, purchasedCredits: 1000 })
      expect((await readUser()).billingPeriodEnd).toEqual(new Date(NEXT_PERIOD_END * 1000))
    })

    it('resets a negative Subscription balance and keeps Purchased credits', async () => {
      await insertProSubscriber({
        creditsRemaining: -25,
        purchasedCredits: 1000,
        billingPeriodEnd: new Date(PERIOD_END * 1000),
      })

      await postWebhook(renewalInvoiceEvent())

      expect(await balances()).toEqual({ subscriptionCredits: TIER_CONFIG.pro.credits, purchasedCredits: 1000 })
    })

    it('changes nothing when Stripe redelivers the renewal after Credits were spent', async () => {
      await insertProSubscriber({
        creditsRemaining: 40,
        purchasedCredits: 1000,
        billingPeriodEnd: new Date(PERIOD_END * 1000),
      })
      await postWebhook(renewalInvoiceEvent())
      await db.update(schema.users).set({ creditsRemaining: 600 }).where(eq(schema.users.id, USER_ID))

      await postWebhook(renewalInvoiceEvent())

      expect(await balances()).toEqual({ subscriptionCredits: 600, purchasedCredits: 1000 })
    })

    it('ignores the first invoice of a subscription (the created event grants Credits)', async () => {
      await insertProSubscriber({ creditsRemaining: 40, purchasedCredits: 1000 })

      await postWebhook(renewalInvoiceEvent({ billingReason: 'subscription_create' }))

      expect(await balances()).toEqual({ subscriptionCredits: 40, purchasedCredits: 1000 })
    })
  })

  describe('customer.subscription.created', () => {
    const insertFreeBuyer = () =>
      insertUser({
        creditsRemaining: TIER_CONFIG.free.credits,
        purchasedCredits: 1000,
        creditsIncluded: TIER_CONFIG.free.credits,
        stripeCustomerId: CUSTOMER_ID,
      })

    it('gives a Free user the plan Subscription credits and keeps Purchased credits', async () => {
      await insertFreeBuyer()

      await postWebhook(subscriptionEvent({ type: 'customer.subscription.created', priceId: TIER_CONFIG.pro.priceId }))

      const user = await readUser()
      expect(user.tier).toBe('pro')
      expect(user.billingPeriodEnd).toEqual(new Date(PERIOD_END * 1000))
      expect(await balances()).toEqual({ subscriptionCredits: TIER_CONFIG.pro.credits, purchasedCredits: 1000 })
      expect(mocks.sendPurchaseEmail).toHaveBeenCalledTimes(1)
    })

    it('grants no Credits while the first payment is still incomplete', async () => {
      await insertFreeBuyer()

      await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.created', priceId: TIER_CONFIG.pro.priceId, status: 'incomplete' })
      )

      expect(await balances()).toEqual({ subscriptionCredits: TIER_CONFIG.free.credits, purchasedCredits: 1000 })
    })

    it('grants the plan Subscription credits once an incomplete subscription becomes active', async () => {
      await insertProSubscriber({ creditsRemaining: 7, purchasedCredits: 1000, subscriptionStatus: 'incomplete' })

      await postWebhook(subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId }))

      expect(await balances()).toEqual({ subscriptionCredits: TIER_CONFIG.pro.credits, purchasedCredits: 1000 })
      expect(mocks.sendPurchaseEmail).toHaveBeenCalledTimes(1)
    })

    it('changes nothing when Stripe redelivers the created event', async () => {
      await insertFreeBuyer()
      await postWebhook(subscriptionEvent({ type: 'customer.subscription.created', priceId: TIER_CONFIG.pro.priceId }))
      await db.update(schema.users).set({ creditsRemaining: 900 }).where(eq(schema.users.id, USER_ID))

      await postWebhook(subscriptionEvent({ type: 'customer.subscription.created', priceId: TIER_CONFIG.pro.priceId }))

      expect(await balances()).toEqual({ subscriptionCredits: 900, purchasedCredits: 1000 })
      expect(mocks.sendPurchaseEmail).toHaveBeenCalledTimes(1)
    })
  })

  describe('customer.subscription.updated', () => {
    it('keeps both balances on an upgrade and switches the plan', async () => {
      await insertProSubscriber({ creditsRemaining: 300, purchasedCredits: 1000 })

      await postWebhook(subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.ultra.priceId }))

      const user = await readUser()
      expect(user.tier).toBe('ultra')
      expect(user.stripePriceId).toBe(TIER_CONFIG.ultra.priceId)
      expect(user.creditsIncluded).toBe(TIER_CONFIG.ultra.credits)
      expect(await balances()).toEqual({ subscriptionCredits: 300, purchasedCredits: 1000 })
      expect(mocks.invalidateUserTierCache).toHaveBeenCalledWith(USER_ID)
    })

    it('keeps both balances on a downgrade', async () => {
      await insertProSubscriber({
        tier: 'ultra',
        stripePriceId: TIER_CONFIG.ultra.priceId,
        creditsRemaining: 0,
        purchasedCredits: 1000,
      })

      await postWebhook(subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId }))

      expect((await readUser()).tier).toBe('pro')
      expect(await balances()).toEqual({ subscriptionCredits: 0, purchasedCredits: 1000 })
    })

    it('keeps both balances when the user schedules cancellation at period end', async () => {
      await insertProSubscriber({ creditsRemaining: 300, purchasedCredits: 1000 })

      const response = await postWebhook(
        subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId, cancelAtPeriodEnd: true })
      )

      expect(response.status).toBe(200)
      expect((await readUser()).cancelAtPeriodEnd).toBe(true)
      expect(await balances()).toEqual({ subscriptionCredits: 300, purchasedCredits: 1000 })
    })

    it('does not refill Credits when a past_due subscription recovers (the renewal invoice does)', async () => {
      await insertProSubscriber({ creditsRemaining: 0, purchasedCredits: 1000, subscriptionStatus: 'past_due' })

      await postWebhook(subscriptionEvent({ type: 'customer.subscription.updated', priceId: TIER_CONFIG.pro.priceId }))

      expect((await readUser()).subscriptionStatus).toBe('active')
      expect(await balances()).toEqual({ subscriptionCredits: 0, purchasedCredits: 1000 })
      expect(mocks.sendPurchaseEmail).not.toHaveBeenCalled()
    })
  })

  describe('customer.subscription.deleted (cancellation)', () => {
    const cancel = () =>
      postWebhook(
        subscriptionEvent({ type: 'customer.subscription.deleted', priceId: TIER_CONFIG.pro.priceId, status: 'canceled' })
      )

    it('lapses Subscription credits to the Free grant and keeps Purchased credits', async () => {
      await insertProSubscriber({ creditsRemaining: 300, purchasedCredits: 1000 })

      await cancel()

      const user = await readUser()
      expect(user.tier).toBe('free')
      expect(user.creditsIncluded).toBe(TIER_CONFIG.free.credits)
      expect(await balances()).toEqual({ subscriptionCredits: 7, purchasedCredits: 1000 })
      expect(mocks.invalidateUserTierCache).toHaveBeenCalledWith(USER_ID)
    })

    it('keeps Subscription credits below the Free grant as they are', async () => {
      await insertProSubscriber({ creditsRemaining: 3, purchasedCredits: 1000 })

      await cancel()

      expect(await balances()).toEqual({ subscriptionCredits: 3, purchasedCredits: 1000 })
    })

    it('keeps a negative Subscription balance and Purchased credits', async () => {
      await insertProSubscriber({ creditsRemaining: -50, purchasedCredits: 1000 })

      await cancel()

      expect(await balances()).toEqual({ subscriptionCredits: -50, purchasedCredits: 1000 })
    })

    it('changes nothing when Stripe redelivers the cancellation', async () => {
      await insertProSubscriber({ creditsRemaining: 300, purchasedCredits: 1000 })
      await cancel()

      await cancel()

      expect(await balances()).toEqual({ subscriptionCredits: 7, purchasedCredits: 1000 })
    })
  })
})
