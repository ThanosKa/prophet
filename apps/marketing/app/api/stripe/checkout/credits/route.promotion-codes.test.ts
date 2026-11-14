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
const { EXTRA_CREDITS } = await import('@/lib/pricing')

const USER_ID = 'user_credits_checkout'

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

describe('POST /api/stripe/checkout/credits', () => {
  it('sells Purchased credits at their own price with promotion codes off', async () => {
    const response = await POST()

    expect(response.status).toBe(200)
    expect(mocks.createSession).toHaveBeenCalledTimes(1)
    const session = mocks.createSession.mock.calls[0][0]
    expect(session.mode).toBe('payment')
    expect(session.line_items).toEqual([{ price: EXTRA_CREDITS.priceId, quantity: 1 }])
    expect(session.allow_promotion_codes).toBe(false)
  })
})
