import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { usageRecords } from '@/lib/db/schema'
import { GET } from './route'

const { authMock, checkRateLimitMock } = vi.hoisted(() => ({
  authMock: vi.fn<() => Promise<{ userId: string | null }>>(),
  checkRateLimitMock: vi.fn<() => Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }>>(),
}))

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: checkRateLimitMock }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))

// The daily aggregation is SQL (grouping by UTC day, sums, paging), so it runs against
// a real Postgres engine in-process rather than a mocked query builder.
vi.mock('@/lib/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const schema = await import('@/lib/db/schema')
  return { db: drizzle(new PGlite(), { schema }) }
})

const { db } = await import('@/lib/db')

const USER_ID = 'user_usage_test'
const OTHER_USER_ID = 'user_someone_else'

type SeedRow = {
  at: string
  model?: string
  userId?: string
  inputTokens?: number
  cacheCreationInputTokens?: number
  cacheReadInputTokens?: number
  outputTokens?: number
  costCents?: number
}

async function seed(rows: SeedRow[]) {
  await db.insert(usageRecords).values(
    rows.map(row => ({
      userId: row.userId ?? USER_ID,
      model: row.model ?? 'claude-haiku-5-5',
      inputTokens: row.inputTokens ?? 0,
      cacheCreationInputTokens: row.cacheCreationInputTokens ?? 0,
      cacheReadInputTokens: row.cacheReadInputTokens ?? 0,
      outputTokens: row.outputTokens ?? 0,
      costCents: row.costCents ?? 1,
      createdAt: new Date(row.at),
    }))
  )
}

async function getUsage(query = '') {
  const response = await GET(new Request(`http://localhost:3000/api/usage${query}`))
  return { status: response.status, body: await response.json() }
}

describe('GET /api/usage (daily totals per model)', () => {
  beforeAll(async () => {
    await db.execute(sql`
      CREATE TABLE usage_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL,
        input_tokens integer NOT NULL,
        cache_creation_input_tokens integer NOT NULL DEFAULT 0,
        cache_read_input_tokens integer NOT NULL DEFAULT 0,
        output_tokens integer NOT NULL,
        cost_cents integer NOT NULL,
        model text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`)
  })

  beforeEach(async () => {
    await db.execute(sql`DELETE FROM usage_records`)
    authMock.mockResolvedValue({ userId: USER_ID })
    checkRateLimitMock.mockResolvedValue({ success: true })
  })

  it('gives one row per model when two models were used on the same day', async () => {
    await seed([
      { at: '2026-10-07T09:00:00Z', model: 'claude-haiku-5-5' },
      { at: '2026-10-07T10:00:00Z', model: 'claude-sonnet-5-5' },
    ])

    const { status, body } = await getUsage()

    expect(status).toBe(200)
    expect(body.data.rows).toEqual([
      expect.objectContaining({ day: '2026-10-07', model: 'claude-haiku-5-5' }),
      expect.objectContaining({ day: '2026-10-07', model: 'claude-sonnet-5-5' }),
    ])
  })

  it('counts Turns and sums tokens including cache write and cache read, and Credits', async () => {
    await seed([
      { at: '2026-10-07T09:00:00Z', inputTokens: 120, cacheCreationInputTokens: 4000, cacheReadInputTokens: 0, outputTokens: 300, costCents: 2 },
      { at: '2026-10-07T09:00:05Z', inputTokens: 80, cacheCreationInputTokens: 500, cacheReadInputTokens: 4000, outputTokens: 200, costCents: 1 },
      { at: '2026-10-07T18:30:00Z', inputTokens: 50, cacheCreationInputTokens: 0, cacheReadInputTokens: 4500, outputTokens: 1000, costCents: 3 },
    ])

    const { body } = await getUsage()

    expect(body.data.rows).toEqual([
      {
        day: '2026-10-07',
        model: 'claude-haiku-5-5',
        turns: 3,
        inputTokens: 250,
        cacheWriteTokens: 4500,
        cacheReadTokens: 8500,
        outputTokens: 1500,
        tokens: 14750,
        credits: 6,
      },
    ])
  })

  it('pages by day, newest first, walking back through older days with no gaps or duplicates', async () => {
    await seed([
      { at: '2026-10-08T08:00:00Z', model: 'claude-haiku-5-5' },
      { at: '2026-10-08T09:00:00Z', model: 'claude-sonnet-5-5' },
      { at: '2026-10-07T23:59:59Z' },
      { at: '2026-10-05T00:00:00Z', model: 'claude-haiku-5-5' },
      { at: '2026-10-05T12:00:00Z', model: 'claude-opus-5-5' },
      { at: '2026-10-05T13:00:00Z', model: 'claude-sonnet-5-5' },
      { at: '2026-10-01T10:00:00Z' },
    ])
    const dayAndModel = (rows: Array<{ day: string; model: string }>) =>
      rows.map(row => `${row.day} ${row.model}`)

    const first = await getUsage('?days=2')
    expect(dayAndModel(first.body.data.rows)).toEqual([
      '2026-10-08 claude-haiku-5-5',
      '2026-10-08 claude-sonnet-5-5',
      '2026-10-07 claude-haiku-5-5',
    ])
    expect(first.body.data.nextBefore).toBe('2026-10-07')

    const second = await getUsage(`?days=2&before=${first.body.data.nextBefore}`)
    expect(dayAndModel(second.body.data.rows)).toEqual([
      '2026-10-05 claude-haiku-5-5',
      '2026-10-05 claude-opus-5-5',
      '2026-10-05 claude-sonnet-5-5',
      '2026-10-01 claude-haiku-5-5',
    ])
    expect(second.body.data.nextBefore).toBeNull()
  })

  it('has no next page when the last page ends exactly on the oldest day', async () => {
    await seed([{ at: '2026-10-08T08:00:00Z' }, { at: '2026-10-07T08:00:00Z' }])

    const { body } = await getUsage('?days=2')

    expect(body.data.rows).toHaveLength(2)
    expect(body.data.nextBefore).toBeNull()
  })

  it("shows a user only their own usage, never another user's", async () => {
    await seed([
      { at: '2026-10-07T09:00:00Z', costCents: 2 },
      { at: '2026-10-07T09:30:00Z', userId: OTHER_USER_ID, costCents: 50 },
      { at: '2026-10-06T09:30:00Z', userId: OTHER_USER_ID, costCents: 70 },
    ])

    const { body } = await getUsage()

    expect(body.data.rows).toEqual([
      expect.objectContaining({ day: '2026-10-07', turns: 1, credits: 2 }),
    ])
  })

  it('groups by UTC day, whatever offset the timestamp was written with', async () => {
    await seed([
      { at: '2026-10-07T23:30:00-02:00' }, // 2026-10-08 01:30 UTC
      { at: '2026-10-08T00:30:00+03:00' }, // 2026-10-07 21:30 UTC
    ])

    const { body } = await getUsage()

    expect(body.data.rows.map((row: { day: string }) => row.day)).toEqual(['2026-10-08', '2026-10-07'])
  })

  it('totals the from/to range as whole UTC days, including all of the last day', async () => {
    await seed([
      { at: '2026-10-08T00:00:00Z', costCents: 100 },
      { at: '2026-10-07T23:59:59.500Z', costCents: 5 },
      { at: '2026-10-07T08:00:00Z', costCents: 7 },
      { at: '2026-10-06T00:00:00Z', costCents: 9 },
      { at: '2026-10-05T23:59:59.999Z', costCents: 200 },
    ])

    const { body } = await getUsage('?from=2026-10-06&to=2026-10-07')

    expect(body.data.rows).toEqual([
      expect.objectContaining({ day: '2026-10-07', turns: 2, credits: 12 }),
      expect.objectContaining({ day: '2026-10-06', turns: 1, credits: 9 }),
    ])
  })

  it('totals a single UTC day when from and to are the same day', async () => {
    await seed([
      { at: '2026-10-07T23:59:59.999Z', costCents: 5 },
      { at: '2026-10-07T00:00:00Z', costCents: 7 },
      { at: '2026-10-08T00:00:00Z', costCents: 100 },
    ])

    const { body } = await getUsage('?from=2026-10-07&to=2026-10-07')

    expect(body.data.rows).toEqual([expect.objectContaining({ day: '2026-10-07', turns: 2, credits: 12 })])
  })

  it('returns 401 when the user is not signed in', async () => {
    authMock.mockResolvedValue({ userId: null })

    const { status, body } = await getUsage()

    expect(status).toBe(401)
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('returns 429 when the user is rate limited', async () => {
    checkRateLimitMock.mockResolvedValue({ success: false, limit: 100, remaining: 0, reset: 60 })

    const { status, body } = await getUsage()

    expect(status).toBe(429)
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it.each([
    ['a day that is not YYYY-MM-DD', '?before=08-10-2026'],
    ['a day that does not exist', '?before=2026-02-30'],
    ['a range end that is a timestamp, not a UTC day', '?to=2026-10-07T23:59:59.999Z'],
    ['zero days', '?days=0'],
    ['too many days', '?days=91'],
    ['a non-numeric page size', '?days=week'],
  ])('returns 400 for %s', async (_label, query) => {
    const { status, body } = await getUsage(query)

    expect(status).toBe(400)
    expect(body.code).toBe('VALIDATION_ERROR')
  })
})
