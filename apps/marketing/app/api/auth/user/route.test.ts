import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { sql } from 'drizzle-orm'
import { userBalanceSchema } from '@prophet/shared'
import * as schema from '@/lib/db/schema'
import { GET } from './route'

vi.mock('@/lib/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dbSchema = await import('@/lib/db/schema')
  return { db: drizzle(new PGlite(), { schema: dbSchema }) }
})

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn<() => Promise<{ userId: string | null }>>(),
}))

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { db } = await import('@/lib/db')
const { checkRateLimit } = await import('@/lib/ratelimit')

const USER_ID = 'user_balance'

beforeAll(async () => {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await db.delete(schema.users)
  authMock.mockResolvedValue({ userId: USER_ID })
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 60 })
})

describe('GET /api/auth/user', () => {
  it('returns the total balance and the Purchased credits within it', async () => {
    await db.insert(schema.users).values({
      id: USER_ID,
      email: 'buyer@example.com',
      creditsRemaining: 3,
      purchasedCredits: 10,
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toMatchObject({ id: USER_ID, creditsRemaining: 13, purchasedCredits: 10 })
    expect(userBalanceSchema.safeParse(body.data).success).toBe(true)
  })

  it('counts negative Subscription credits in the total', async () => {
    await db.insert(schema.users).values({
      id: USER_ID,
      email: 'buyer@example.com',
      creditsRemaining: -2,
      purchasedCredits: 10,
    })

    const response = await GET()
    const body = await response.json()

    expect(body.data).toMatchObject({ creditsRemaining: 8, purchasedCredits: 10 })
  })
})
