import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { POST } from './route'

vi.mock('@/lib/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dbSchema = await import('@/lib/db/schema')
  return { db: drizzle(new PGlite(), { schema: dbSchema }) }
})

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ userId: string | null }>>(),
  createSession: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }))
vi.mock('@/lib/stripe', () => ({
  stripe: { checkout: { sessions: { create: mocks.createSession } } },
}))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { db } = await import('@/lib/db')

const USER_ID = 'user_one_plan'

type PlanState = Pick<
  typeof schema.users.$inferInsert,
  'tier' | 'stripeCustomerId' | 'stripeSubscriptionId' | 'subscriptionStatus' | 'cancelAtPeriodEnd'
>

const PRO_SUBSCRIBER: PlanState = {
  tier: 'pro',
  stripeCustomerId: 'cus_pro',
  stripeSubscriptionId: 'sub_pro',
  subscriptionStatus: 'active',
}

beforeAll(async () => {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ userId: USER_ID })
  mocks.createSession.mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.test/cs_test' })
  await db.delete(schema.users)
})

async function givenUser(plan: PlanState) {
  await db.insert(schema.users).values({ id: USER_ID, email: 'subscriber@example.com', ...plan })
}

async function checkout(body: unknown) {
  const response = await POST(
    new Request('http://localhost/api/stripe/checkout', { method: 'POST', body: JSON.stringify(body) })
  )
  return { status: response.status, body: await response.json() }
}

describe('POST /api/stripe/checkout refuses a second plan', () => {
  it('answers 409 SUBSCRIPTION_EXISTS to an active subscriber and does not call Stripe', async () => {
    await givenUser(PRO_SUBSCRIBER)

    const { status, body } = await checkout({ tier: 'premium', mode: 'subscription' })

    expect(status).toBe(409)
    expect(body.code).toBe('SUBSCRIPTION_EXISTS')
    expect(mocks.createSession).not.toHaveBeenCalled()
  })

  it('answers 409 SUBSCRIPTION_EXISTS to a past_due subscriber and does not call Stripe', async () => {
    await givenUser({ ...PRO_SUBSCRIBER, subscriptionStatus: 'past_due' })

    const { status, body } = await checkout({ tier: 'ultra' })

    expect(status).toBe(409)
    expect(body.code).toBe('SUBSCRIPTION_EXISTS')
    expect(mocks.createSession).not.toHaveBeenCalled()
  })

  it('refuses a subscriber whose cancellation is only scheduled, since the plan is still active', async () => {
    await givenUser({ ...PRO_SUBSCRIBER, cancelAtPeriodEnd: true })

    const { status, body } = await checkout({ tier: 'pro' })

    expect(status).toBe(409)
    expect(body.code).toBe('SUBSCRIPTION_EXISTS')
    expect(mocks.createSession).not.toHaveBeenCalled()
  })
})

describe('POST /api/stripe/checkout still opens a plan checkout without a live plan', () => {
  it('creates a session for a Free user', async () => {
    await givenUser({ tier: 'free' })

    const { status, body } = await checkout({ tier: 'pro' })

    expect(status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.test/cs_test')
    expect(mocks.createSession).toHaveBeenCalledTimes(1)
  })

  it('creates a session for a user whose plan was fully cancelled (no subscription id)', async () => {
    await givenUser({
      tier: 'free',
      stripeCustomerId: 'cus_former',
      stripeSubscriptionId: null,
      subscriptionStatus: 'canceled',
    })

    const { status } = await checkout({ tier: 'premium' })

    expect(status).toBe(200)
    expect(mocks.createSession).toHaveBeenCalledTimes(1)
    expect(mocks.createSession.mock.calls[0][0].customer).toBe('cus_former')
  })

  it('creates a session for an incomplete user, so a failed first payment can be retried', async () => {
    await givenUser({ ...PRO_SUBSCRIBER, tier: 'free', subscriptionStatus: 'incomplete' })

    const { status } = await checkout({ tier: 'pro' })

    expect(status).toBe(200)
    expect(mocks.createSession).toHaveBeenCalledTimes(1)
  })

  it('never refuses Purchased credits, even to an active subscriber', async () => {
    await givenUser(PRO_SUBSCRIBER)

    const { status } = await checkout({ mode: 'payment' })

    expect(status).toBe(200)
    expect(mocks.createSession).toHaveBeenCalledTimes(1)
    expect(mocks.createSession.mock.calls[0][0].mode).toBe('payment')
  })
})
