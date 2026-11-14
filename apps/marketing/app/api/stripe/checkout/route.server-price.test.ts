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
const { TIER_CONFIG, EXTRA_CREDITS } = await import('@/lib/pricing')

const USER_ID = 'user_checkout'
// An active one-time price in the same Stripe account that costs less than Purchased credits.
const FOREIGN_PRICE_ID = 'price_cheap_one_time'

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
  await db.insert(schema.users).values({ id: USER_ID, email: 'buyer@example.com' })
})

async function checkout(body: unknown) {
  const response = await POST(
    new Request('http://localhost/api/stripe/checkout', { method: 'POST', body: JSON.stringify(body) })
  )
  return { status: response.status, body: await response.json() }
}

function createdSession() {
  expect(mocks.createSession).toHaveBeenCalledTimes(1)
  return mocks.createSession.mock.calls[0][0]
}

describe('POST /api/stripe/checkout prices every session on the server', () => {
  it('creates a plan session at the tier price when the body names a foreign price', async () => {
    const { status, body } = await checkout({ priceId: FOREIGN_PRICE_ID, tier: 'premium', mode: 'subscription' })

    expect(status).toBe(200)
    expect(body.url).toBe('https://checkout.stripe.test/cs_test')
    const session = createdSession()
    expect(session.mode).toBe('subscription')
    expect(session.line_items).toEqual([{ price: TIER_CONFIG.premium.priceId, quantity: 1 }])
    expect(session.allow_promotion_codes).toBe(true)
    expect(session.metadata).toEqual({ userId: USER_ID, tier: 'premium' })
  })

  it('sells Purchased credits at their own price with no promotion codes when the body names a foreign price', async () => {
    const { status } = await checkout({ priceId: FOREIGN_PRICE_ID, mode: 'payment' })

    expect(status).toBe(200)
    const session = createdSession()
    expect(session.mode).toBe('payment')
    expect(session.line_items).toEqual([{ price: EXTRA_CREDITS.priceId, quantity: 1 }])
    expect(session.allow_promotion_codes).toBe(false)
    expect(session.metadata).toEqual({ userId: USER_ID, type: 'extra_credits', credits: '1000' })
  })

  it('creates a plan session when the body sends no price id', async () => {
    const { status } = await checkout({ tier: 'pro' })

    expect(status).toBe(200)
    expect(createdSession().line_items).toEqual([{ price: TIER_CONFIG.pro.priceId, quantity: 1 }])
  })

  it('creates a Purchased credits session when the body sends no price id', async () => {
    const { status } = await checkout({ mode: 'payment' })

    expect(status).toBe(200)
    expect(createdSession().line_items).toEqual([{ price: EXTRA_CREDITS.priceId, quantity: 1 }])
  })

  it('still refuses a plan checkout without a tier', async () => {
    const { status } = await checkout({ priceId: TIER_CONFIG.pro.priceId, mode: 'subscription' })

    expect(status).toBe(400)
    expect(mocks.createSession).not.toHaveBeenCalled()
  })
})
