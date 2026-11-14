import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { eq, sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { openRun } from '@/lib/agent/run-record'
import { takeHold } from './turn-hold'

const logger = vi.hoisted(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger }))

const db = drizzle(new PGlite(), { schema })

const USER_ID = 'user_hold'
const CHAT_ID = '550e8400-e29b-41d4-a716-446655440000'
const MODEL = 'claude-sonnet-5-5'

beforeAll(async () => {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) await db.execute(sql.raw(statement))
})

beforeEach(async () => {
  vi.clearAllMocks()
  await db.delete(schema.users)
  await db.insert(schema.users).values({ id: USER_ID, email: 'hold@example.com', creditsRemaining: 1000 })
  await db.insert(schema.chats).values({ id: CHAT_ID, userId: USER_ID, title: 'Chat' })
})

async function balance(): Promise<number | undefined> {
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, USER_ID) })
  return row?.creditsRemaining
}

/** The database with a switch that makes the next call of one method fail. */
function faultyDb() {
  const failing = new Set<PropertyKey>()
  const faulty = new Proxy(db, {
    get(target, prop) {
      if (failing.has(prop)) {
        return () => {
          failing.delete(prop)
          throw new Error('connection reset')
        }
      }
      const value: unknown = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
  return { db: faulty, failNext: (method: 'transaction' | 'update') => failing.add(method) }
}

function take(reserveCents: number, database: typeof db = db) {
  return takeHold({ db: database, userId: USER_ID, chatId: CHAT_ID, model: MODEL, reserveCents })
}

async function firstTurn() {
  const { opening } = await openRun({ db, chatId: CHAT_ID, userMessage: 'Open my inbox' })
  return { type: 'first' as const, opening }
}

// Sonnet 5.5: $2 per MTok in, $10 per MTok out, plus the 25% Margin, rounded up.
// 100K in + 10K out = $0.30, 38 Credits; 1M in = $2.00, 250 Credits.
const USAGE_38 = { inputTokens: 100_000, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, outputTokens: 10_000 }
const USAGE_250 = { inputTokens: 1_000_000, cacheCreationInputTokens: 0, cacheReadInputTokens: 0, outputTokens: 0 }

function finished({ request, usage = USAGE_38, isFinalTurn = true }: {
  request: Awaited<ReturnType<typeof firstTurn>>
  usage?: typeof USAGE_38
  isFinalTurn?: boolean
}) {
  return {
    type: 'finished' as const,
    request,
    usage,
    ending: { type: 'reply' as const, text: 'Inbox opened.', releasedToolCalls: [] },
    isFinalTurn,
  }
}

async function assistantRows() {
  return db.query.messages.findMany({ where: eq(schema.messages.role, 'assistant') })
}

async function usageCosts(): Promise<number[]> {
  const rows = await db.query.usageRecords.findMany()
  return rows.map((row) => row.costCents)
}

function loggedLines(level: 'info' | 'warn' | 'error', message: string): Array<Record<string, unknown>> {
  return logger[level].mock.calls.filter(([, text]) => text === message).map(([fields]) => fields)
}

describe('takeHold', () => {
  it('sets the Hold aside from the balance', async () => {
    const hold = await take(100)

    expect(hold?.reserveCents).toBe(100)
    expect(await balance()).toBe(900)
  })

  it("returns null and logs nothing when the balance can't cover the Hold", async () => {
    expect(await take(1001)).toBeNull()
    expect(await balance()).toBe(1000)
    expect(logger.info).not.toHaveBeenCalled()
  })
})

describe('close(not_started)', () => {
  it('returns the whole Hold and writes no record', async () => {
    const hold = await take(100)
    await firstTurn()

    expect(await hold?.close({ type: 'not_started' })).toEqual({ chargedCents: 0 })
    expect(await balance()).toBe(1000)
    expect(await usageCosts()).toEqual([])
    expect(await assistantRows()).toEqual([])
  })

  it('keeps the Hold and logs it when the return fails, without throwing', async () => {
    const faulty = faultyDb()
    const hold = await take(100, faulty.db)
    faulty.failNext('update')

    expect(await hold?.close({ type: 'not_started' })).toBeNull()
    expect(await balance()).toBe(900)
    expect(loggedLines('error', 'Failed to return the hold of a Turn that never started; hold kept')).toHaveLength(1)
    expect(loggedLines('info', 'Credit hold settled')).toEqual([])
  })
})

describe('close(finished)', () => {
  it('charges the cost and writes the usage row and the Run record', async () => {
    const hold = await take(100)

    expect(await hold?.close(finished({ request: await firstTurn() }))).toEqual({ chargedCents: 38 })
    expect(await balance()).toBe(962)
    expect(await usageCosts()).toEqual([38])
    expect(await assistantRows()).toMatchObject([{ content: 'Inbox opened.', costCents: 38 }])
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('charges a cost above the Hold in full and warns of the overage', async () => {
    const hold = await take(100)

    expect(await hold?.close(finished({ request: await firstTurn(), usage: USAGE_250 }))).toEqual({
      chargedCents: 250,
    })
    expect(await balance()).toBe(750)
    expect(await usageCosts()).toEqual([250])
    expect(loggedLines('warn', 'Turn cost exceeded its Hold (cache miss or input estimate miss)')).toEqual([
      expect.objectContaining({ reserveCents: 100, costCents: 250, inputTokens: 1_000_000 }),
    ])
  })

  it("changes the chat's context tokens only on the final Turn", async () => {
    const request = await firstTurn()
    const chat = () => db.query.chats.findFirst({ where: eq(schema.chats.id, CHAT_ID) })

    await (await take(100))?.close(finished({ request, isFinalTurn: false }))
    expect(await chat()).toMatchObject({ contextTokens: 0, contextInputTokens: 0, contextOutputTokens: 0 })

    await (await take(100))?.close(finished({ request, isFinalTurn: true }))
    expect(await chat()).toMatchObject({
      contextTokens: 110_000,
      contextInputTokens: 100_000,
      contextOutputTokens: 10_000,
    })
  })

  it('throws when its transaction fails and leaves the Hold for an unfinished close, which settles once', async () => {
    const faulty = faultyDb()
    const hold = await take(100, faulty.db)
    const request = await firstTurn()
    faulty.failNext('transaction')

    await expect(hold?.close(finished({ request }))).rejects.toThrow('connection reset')
    expect(await balance()).toBe(900)

    const partial = { usageReported: false, usage: USAGE_38, streamedOutput: '', text: 'Inbox' }
    expect(await hold?.close({ type: 'unfinished', request, partial })).toEqual({ chargedCents: 0 })
    expect(await hold?.close({ type: 'unfinished', request, partial })).toBeNull()
    expect(await balance()).toBe(1000)
    expect(loggedLines('info', 'Credit hold settled')).toHaveLength(1)
  })
})

describe('close(unfinished)', () => {
  it('charges 0 and writes no usage row before message_start, but keeps the text so far', async () => {
    const hold = await take(100)
    const partial = { usageReported: false, usage: USAGE_38, streamedOutput: 'Open', text: 'Open' }

    expect(await hold?.close({ type: 'unfinished', request: await firstTurn(), partial })).toEqual({
      chargedCents: 0,
    })
    expect(await balance()).toBe(1000)
    expect(await usageCosts()).toEqual([])
    expect(await assistantRows()).toMatchObject([{ content: 'Open', costCents: 0, toolCalls: null }])
  })

  // 20,000 ASCII characters streamed estimate 10K output tokens, more than the 1 reported:
  // 100K in + 10K out is 38 Credits.
  it.each([
    { reserveCents: 100, chargedCents: 38 },
    { reserveCents: 30, chargedCents: 30 },
  ])('after message_start charges the lesser of a $reserveCents-Credit Hold and the estimate', async ({
    reserveCents,
    chargedCents,
  }) => {
    const hold = await take(reserveCents)
    const partial = {
      usageReported: true,
      usage: { ...USAGE_38, outputTokens: 1 },
      streamedOutput: 'x'.repeat(20_000),
      text: 'Reading',
    }

    expect(await hold?.close({ type: 'unfinished', request: await firstTurn(), partial })).toEqual({ chargedCents })
    expect(await balance()).toBe(1000 - chargedCents)
    expect(await usageCosts()).toEqual([chargedCents])
  })

  it('keeps the Hold and logs it when its transaction fails, without throwing', async () => {
    const faulty = faultyDb()
    const hold = await take(100, faulty.db)
    const request = await firstTurn()
    faulty.failNext('transaction')
    const partial = { usageReported: true, usage: USAGE_38, streamedOutput: '', text: '' }

    expect(await hold?.close({ type: 'unfinished', request, partial })).toBeNull()
    expect(await balance()).toBe(900)
    expect(loggedLines('error', 'Failed to settle credit reservation; hold kept')).toHaveLength(1)
  })
})

describe('a closed Hold', () => {
  it('does nothing on a second close', async () => {
    const hold = await take(100)
    const request = await firstTurn()
    await hold?.close(finished({ request }))

    const partial = { usageReported: true, usage: USAGE_38, streamedOutput: '', text: 'Inbox' }
    expect(await hold?.close({ type: 'unfinished', request, partial })).toBeNull()
    expect(await hold?.close({ type: 'not_started' })).toBeNull()
    expect(await balance()).toBe(962)
    expect(await usageCosts()).toEqual([38])
  })

  it('logs taken and settled under one hold id, with the charged amount', async () => {
    const hold = await take(100)
    await hold?.close(finished({ request: await firstTurn() }))

    const [taken] = loggedLines('info', 'Credit hold taken')
    const [settled] = loggedLines('info', 'Credit hold settled')
    expect(taken).toEqual({
      userId: USER_ID,
      chatId: CHAT_ID,
      holdId: expect.any(String),
      reserveCents: 100,
      subscriptionCents: 100,
      purchasedCents: 0,
    })
    expect(settled).toEqual({ userId: USER_ID, chatId: CHAT_ID, holdId: taken?.holdId, actualCents: 38 })
  })
})
