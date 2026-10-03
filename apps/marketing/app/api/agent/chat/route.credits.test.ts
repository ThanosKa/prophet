import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { eq, sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { POST } from './route'

vi.mock('@/lib/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dbSchema = await import('@/lib/db/schema')
  return { db: drizzle(new PGlite(), { schema: dbSchema }) }
})

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({ anthropic: { messages: { stream: vi.fn() } } }))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/dev-logger', () => ({
  devLogger: { logRequest: vi.fn(), logResponse: vi.fn() },
}))

const { db } = await import('@/lib/db')
const { auth } = await import('@clerk/nextjs/server')
const { checkRateLimit } = await import('@/lib/ratelimit')
const { anthropic } = await import('@/lib/anthropic')

const USER_ID = 'user_free'
const CHAT_ID = '550e8400-e29b-41d4-a716-446655440000'

beforeAll(async () => {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await db.delete(schema.users)
  vi.mocked(auth).mockResolvedValue({ userId: USER_ID } as never)
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 60 })
})

async function seedUser({
  credits,
  history = [],
  tier = 'free',
}: {
  credits: number
  history?: string[]
  tier?: 'free' | 'pro' | 'premium' | 'ultra'
}) {
  await db.insert(schema.users).values({ id: USER_ID, email: 'free@example.com', creditsRemaining: credits, tier })
  await db.insert(schema.chats).values({ id: CHAT_ID, userId: USER_ID, title: 'Chat' })
  for (const [index, content] of history.entries()) {
    await db.insert(schema.messages).values({
      chatId: CHAT_ID,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
    })
  }
}

async function balance(): Promise<number | undefined> {
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, USER_ID) })
  return row?.creditsRemaining
}

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: CHAT_ID, ...body }),
    })
  )
}

function continuationTurn({ model }: { model: string }) {
  return {
    model,
    enableThinking: false,
    previousContent: [
      { type: 'text', text: 'Opening your inbox.' },
      { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://mail.google.com' } },
    ],
    toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Navigated' }],
  }
}

function completedTurn({ inputTokens, outputTokens }: { inputTokens: number; outputTokens: number }) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { input_tokens: inputTokens, output_tokens: 1 } } }
      yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }
      yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Done.' } }
      yield { type: 'content_block_stop', index: 0 }
      yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: outputTokens } }
    },
    finalMessage: () =>
      Promise.resolve({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Done.' }],
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      }),
  }
}

/**
 * 10,000 input tokens reported, 4,000 bytes of text streamed, then the turn hangs
 * until the route aborts the upstream request.
 */
function turnThatHangsAfterStreaming() {
  const upstream: { signal?: AbortSignal } = {}
  vi.mocked(anthropic.messages.stream).mockImplementation(((_params: unknown, options?: { signal?: AbortSignal }) => {
    upstream.signal = options?.signal
    return {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { usage: { input_tokens: 10_000, output_tokens: 1 } } }
        yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }
        yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'x'.repeat(4000) } }
        await new Promise((_resolve, reject) => {
          if (!options?.signal) return reject(new Error('no abort signal passed upstream'))
          options.signal.addEventListener('abort', () => reject(new Error('Request was aborted.')))
        })
      },
      finalMessage: () => new Promise(() => {}),
    }
  }) as never)
  return upstream
}

async function readUntil(reader: ReadableStreamDefaultReader<Uint8Array>, marker: string) {
  const decoder = new TextDecoder()
  let seen = ''
  while (!seen.includes(marker)) {
    const { value, done } = await reader.read()
    if (done) throw new Error(`stream ended before ${marker}`)
    seen += decoder.decode(value)
  }
}

function doneEvent(events: string): unknown {
  const done = events
    .split('\n\n')
    .map((frame) => frame.replace(/^data: /, ''))
    .filter((data) => data.includes('"type":"done"'))
  return done.length === 1 ? JSON.parse(done[0]) : undefined
}

function sentMaxTokens(): number | undefined {
  return vi.mocked(anthropic.messages.stream).mock.calls[0]?.[0].max_tokens
}

describe('credit reservation in POST /api/agent/chat', () => {
  it('shrinks Opus 5.5 max_tokens to what 20 credits afford and charges only the actual cost', async () => {
    await seedUser({ credits: 20 })
    vi.mocked(anthropic.messages.stream).mockReturnValue(
      completedTurn({ inputTokens: 1000, outputTokens: 500 }) as never
    )

    const response = await post({ userMessage: 'Hello', model: 'claude-opus-5-5' })
    await response.text()

    expect(sentMaxTokens()).toBeGreaterThanOrEqual(4096)
    expect(sentMaxTokens()).toBeLessThan(16_000)
    // (1000 x $4 + 500 x $20) / 1M = $0.014 -> x1.2 = 1.68c -> 2 credits
    expect(await balance()).toBe(18)
  })

  it('never shrinks Haiku with thinking to a max_tokens at or below its thinking budget', async () => {
    const outcomes: Array<number | 'refused'> = []
    for (let credits = 1; credits <= 12; credits++) {
      vi.mocked(anthropic.messages.stream).mockClear()
      await db.delete(schema.users)
      await seedUser({ credits })
      vi.mocked(anthropic.messages.stream).mockReturnValue(
        completedTurn({ inputTokens: 100, outputTokens: 100 }) as never
      )

      const response = await post({ userMessage: 'Hello', model: 'claude-haiku-4-5', enableThinking: true })
      await response.text()

      const call = vi.mocked(anthropic.messages.stream).mock.calls[0]?.[0]
      if (!call) {
        expect(response.status).toBe(402)
        outcomes.push('refused')
        continue
      }
      const thinking = call.thinking
      expect(thinking?.type).toBe('enabled')
      if (thinking?.type === 'enabled') expect(call.max_tokens).toBeGreaterThan(thinking.budget_tokens)
      outcomes.push(call.max_tokens)
    }

    expect(outcomes).toContain('refused')
    expect(outcomes.some((maxTokens) => typeof maxTokens === 'number' && maxTokens < 16_000)).toBe(true)
  })

  it('20 parallel Opus 5.5 requests cannot push a 20-credit account below zero', async () => {
    await seedUser({ credits: 20 })
    vi.mocked(anthropic.messages.stream).mockImplementation(
      (() => completedTurn({ inputTokens: 1000, outputTokens: 500 })) as never
    )

    const responses = await Promise.all(
      Array.from({ length: 20 }, () => post({ userMessage: 'Hello', model: 'claude-opus-5-5' }))
    )
    await Promise.all(responses.map((response) => response.text()))

    const served = responses.filter((response) => response.status === 200).length
    // losers of the reserve race get 409 BALANCE_HELD; later readers of the drained row get 402
    const refused = responses.filter((response) => response.status === 409 || response.status === 402).length
    expect(served + refused).toBe(20)
    expect(served).toBeGreaterThanOrEqual(1)
    // each served turn settles at 2 credits; before reservations all 20 ran (-20)
    expect(await balance()).toBe(20 - 2 * served)
    expect(await balance()).toBeGreaterThanOrEqual(0)
  })

  it('refunds the whole hold when Anthropic fails before reporting any usage', async () => {
    await seedUser({ credits: 20 })
    vi.mocked(anthropic.messages.stream).mockRejectedValue(
      new Error('529 {"type":"error","error":{"type":"overloaded_error"}}') as never
    )

    const response = await post({ userMessage: 'Hello', model: 'claude-haiku-4-5' })
    const events = await response.text()

    expect(events).toContain('ANTHROPIC_OVERLOADED')
    expect(await balance()).toBe(20)
  })

  it('a client disconnect mid-stream aborts Anthropic and settles the usage so far', async () => {
    await seedUser({ credits: 1000 })
    const upstream = turnThatHangsAfterStreaming()

    const response = await post({ userMessage: 'Hello', model: 'claude-opus-5-5' })
    const reader = response.body!.getReader()
    await readUntil(reader, 'content_delta')
    await reader.cancel()

    // 10,000 input + 4,000 streamed bytes ~ 2,000 output tokens on Opus 5.5:
    // ($0.04 + $0.04) x1.2 = 9.6c -> 10 credits
    await vi.waitFor(async () => expect(await balance()).toBe(990))
    expect(upstream.signal?.aborted).toBe(true)
  })

  it('settles exactly once when the request signal and the stream cancel both fire', async () => {
    await seedUser({ credits: 1000 })
    turnThatHangsAfterStreaming()
    const disconnect = new AbortController()

    const response = await POST(
      new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: CHAT_ID, userMessage: 'Hello', model: 'claude-opus-5-5' }),
        signal: disconnect.signal,
      })
    )
    const reader = response.body!.getReader()
    await readUntil(reader, 'content_delta')
    disconnect.abort()
    await reader.cancel()

    await vi.waitFor(async () => expect(await balance()).toBe(990))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(await balance()).toBe(990)
    const usage = await db.select().from(schema.usageRecords).where(eq(schema.usageRecords.userId, USER_ID))
    expect(usage).toHaveLength(1)
    expect(usage[0]).toMatchObject({ inputTokens: 10_000, costCents: 10 })
  })

  it('refunds the whole hold when the stream breaks before message_start', async () => {
    await seedUser({ credits: 20 })
    vi.mocked(anthropic.messages.stream).mockReturnValue({
      [Symbol.asyncIterator]: async function* () {
        yield* []
        throw new Error('socket hang up')
      },
      finalMessage: () => Promise.reject(new Error('socket hang up')),
    } as never)

    const response = await post({ userMessage: 'Hello', model: 'claude-haiku-4-5' })
    await response.text()

    expect(await balance()).toBe(20)
  })

  it('answers 402 INSUFFICIENT_BALANCE without calling Anthropic when the floor reserve does not fit', async () => {
    // ~60K chars of history on Opus 5.5: the input alone costs more than 20 credits
    await seedUser({ credits: 20, history: ['a'.repeat(30_000), 'b'.repeat(30_000)] })

    const response = await post({ userMessage: 'continue', model: 'claude-opus-5-5' })
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toEqual({
      error: 'Not enough credits left for Opus 5.5. Switch to Haiku 4.5 or buy more credits.',
      code: 'INSUFFICIENT_BALANCE',
      details: {
        pricingUrl: '/pricing',
        isContinuation: false,
        suggestedModel: 'claude-haiku-4-5',
        canUpgrade: true,
      },
    })
    expect(anthropic.messages.stream).not.toHaveBeenCalled()
    expect(await balance()).toBe(20)
  })
})

describe('done event in POST /api/agent/chat', () => {
  it('flags maxTokensReducedForBalance when a low balance shrank the turn', async () => {
    await seedUser({ credits: 20 })
    vi.mocked(anthropic.messages.stream).mockReturnValue(
      completedTurn({ inputTokens: 1000, outputTokens: 500 }) as never
    )

    const response = await post({ userMessage: 'Hello', model: 'claude-opus-5-5' })

    expect(doneEvent(await response.text())).toMatchObject({ type: 'done', maxTokensReducedForBalance: true })
  })

  it('does not flag maxTokensReducedForBalance when the balance covers the full turn', async () => {
    await seedUser({ credits: 1000 })
    vi.mocked(anthropic.messages.stream).mockReturnValue(
      completedTurn({ inputTokens: 1000, outputTokens: 500 }) as never
    )

    const response = await post({ userMessage: 'Hello', model: 'claude-opus-5-5' })

    expect(sentMaxTokens()).toBe(16_000)
    expect(doneEvent(await response.text())).toMatchObject({ type: 'done', maxTokensReducedForBalance: false })
  })
})

describe('402 INSUFFICIENT_BALANCE wording in POST /api/agent/chat', () => {
  it('tells a fresh free account on Opus 5.5 + Thinking to turn Thinking off or switch to Haiku', async () => {
    await seedUser({ credits: 20 })

    const response = await post({ userMessage: 'Hello', model: 'claude-opus-5-5', enableThinking: true })
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toEqual({
      error:
        'Not enough credits left for Opus 5.5 with Thinking. Turn off Thinking, switch to Haiku 4.5, or buy more credits.',
      code: 'INSUFFICIENT_BALANCE',
      details: {
        pricingUrl: '/pricing',
        isContinuation: false,
        suggestedModel: 'claude-haiku-4-5',
        suggestDisableThinking: true,
        canUpgrade: true,
      },
    })
    expect(anthropic.messages.stream).not.toHaveBeenCalled()
  })

  it('mid-agent-loop on Opus 5.5, tells the user to switch to Haiku and send "continue"', async () => {
    // fresh-chat floors: Haiku 4 credits, Opus 13
    await seedUser({ credits: 8, history: ['Open my inbox'] })

    const response = await post(continuationTurn({ model: 'claude-opus-5-5' }))
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toEqual({
      error:
        'Stopped partway: not enough credits left to finish this task. Switch to Haiku 4.5 and send "continue", or buy more credits.',
      code: 'INSUFFICIENT_BALANCE',
      details: {
        pricingUrl: '/pricing',
        isContinuation: true,
        suggestedModel: 'claude-haiku-4-5',
        canUpgrade: true,
      },
    })
  })

  it('mid-agent-loop with not even Haiku affordable, says the task stopped and to buy credits then "continue"', async () => {
    await seedUser({ credits: 2, history: ['Open my inbox'] })

    const response = await post(continuationTurn({ model: 'claude-opus-5-5' }))
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toEqual({
      error: `Stopped partway: you're out of credits. Buy more credits, then send "continue".`,
      code: 'INSUFFICIENT_BALANCE',
      details: { pricingUrl: '/pricing', isContinuation: true, canUpgrade: true },
    })
  })

  it('first turn with not even Haiku affordable, tells a free user to buy credits or upgrade', async () => {
    await seedUser({ credits: 2 })

    const response = await post({ userMessage: 'Hello', model: 'claude-haiku-4-5' })
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toEqual({
      error: `You're out of credits. Buy more credits or upgrade your plan to keep going.`,
      code: 'INSUFFICIENT_BALANCE',
      details: { pricingUrl: '/pricing', isContinuation: false, canUpgrade: true },
    })
  })

  it('first turn with nothing affordable on the top plan, only offers extra credits', async () => {
    await seedUser({ credits: 2, tier: 'ultra' })

    const response = await post({ userMessage: 'Hello', model: 'claude-opus-5-5' })
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toEqual({
      error: `You're out of credits. Buy extra credits to keep going.`,
      code: 'INSUFFICIENT_BALANCE',
      details: { pricingUrl: '/pricing', isContinuation: false, canUpgrade: false },
    })
  })

  it('on Haiku 4.5 + Thinking, only suggests turning Thinking off (there is no cheaper model)', async () => {
    // fresh-chat Haiku floors: 4 credits without Thinking, 8 with it
    await seedUser({ credits: 5 })

    const response = await post({ userMessage: 'Hello', model: 'claude-haiku-4-5', enableThinking: true })
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toEqual({
      error: 'Not enough credits left for Haiku 4.5 with Thinking. Turn off Thinking or buy more credits.',
      code: 'INSUFFICIENT_BALANCE',
      details: { pricingUrl: '/pricing', isContinuation: false, suggestDisableThinking: true, canUpgrade: true },
    })
  })
})
