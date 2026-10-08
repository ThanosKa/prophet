import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from './route'
import { LEGACY_MODEL_ALIASES } from '@prophet/shared'
import {
  calculateCostInCredits,
  calculateWebSearchCostInCredits,
  type ModelName,
} from '@/lib/pricing'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      chats: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
      messages: { findMany: vi.fn() },
    },
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn(),
}))

// The Run record has its own PGlite tests (route.run-record.test.ts); here the route
// only needs a started Run.
vi.mock('@/lib/agent/run-record', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agent/run-record')>()
  return {
    ...actual,
    openRun: vi.fn(async () => ({ history: [], opening: { id: 'opening', createdAt: new Date() } })),
    writeRunRecord: vi.fn(async () => 'written'),
  }
})

// The reserve/settle SQL has its own PGlite tests; here the route only needs a hold.
vi.mock('@/lib/credit-reservation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/credit-reservation')>()
  return {
    ...actual,
    reserveCredits: vi.fn(async ({ reserveCents }: { reserveCents: number }) => ({
      subscriptionCents: reserveCents,
      purchasedCents: 0,
    })),
    settleCredits: vi.fn(async () => {}),
  }
})

vi.mock('@/lib/anthropic', () => ({
  anthropic: { messages: { stream: vi.fn() } },
}))

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { auth } = await import('@clerk/nextjs/server')
const { db } = await import('@/lib/db')
const { checkRateLimit } = await import('@/lib/ratelimit')
const { anthropic } = await import('@/lib/anthropic')
const { settleCredits } = await import('@/lib/credit-reservation')
const { writeRunRecord } = await import('@/lib/agent/run-record')

const CHAT_ID = '550e8400-e29b-41d4-a716-446655440000'

interface Captured {
  inserts: Array<Record<string, unknown>>
  updates: Array<Record<string, unknown>>
}

function primeRequestContext(): Captured {
  const captured: Captured = { inserts: [], updates: [] }

  vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as never)
  vi.mocked(checkRateLimit).mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    reset: 60,
  })
  vi.mocked(db.query.chats.findFirst).mockResolvedValue({
    id: CHAT_ID,
    userId: 'user1',
    title: 'Chat',
    contextTokens: 0,
    contextInputTokens: 0,
    contextOutputTokens: 0,
    contextReasoningTokens: 0,
    contextCachedInputTokens: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as never)
  vi.mocked(db.query.users.findFirst).mockResolvedValue({
    id: 'user1',
    email: 'test@example.com',
    creditsRemaining: 1000,
    purchasedCredits: 0,
  } as never)
  vi.mocked(db.query.messages.findMany).mockResolvedValue([] as never)

  const recordInsert = () => ({
    values: (values: Record<string, unknown>) => {
      captured.inserts.push(values)
      return Promise.resolve()
    },
  })
  const recordUpdate = () => ({
    set: (values: Record<string, unknown>) => ({
      where: () => {
        captured.updates.push(values)
        return Promise.resolve()
      },
    }),
  })

  vi.mocked(db.insert).mockImplementation(recordInsert as never)
  vi.mocked(db.update).mockImplementation(recordUpdate as never)
  vi.mocked(db.transaction).mockImplementation((async (cb: (tx: unknown) => unknown) =>
    cb({ insert: recordInsert, update: recordUpdate })) as never)

  return captured
}

function mockPlainTurn(inputTokens: number, outputTokens: number) {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { input_tokens: inputTokens } } }
      yield { type: 'content_block_start', index: 0, content_block: { type: 'text' } }
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: 'Hi' },
      }
      yield { type: 'content_block_stop', index: 0 }
      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: outputTokens },
      }
    },
    finalMessage: vi.fn(() =>
      Promise.resolve({
        stop_reason: 'end_turn',
        content: [{ type: 'text', text: 'Hi' }],
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
        },
      })
    ),
  }
  vi.mocked(anthropic.messages.stream).mockResolvedValue(mockStream as never)
}

function mockSearchTurn(webSearchRequests: number) {
  const searchResultBlock = {
    type: 'web_search_tool_result',
    tool_use_id: 'srvtoolu_1',
    content: [
      {
        type: 'web_search_result',
        url: 'https://example.com/a',
        title: 'A',
        encrypted_content: 'ENC',
        page_age: null,
      },
    ],
  }

  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { input_tokens: 1000 } } }
      yield {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search' },
      }
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'input_json_delta', partial_json: '{"query":"claude pricing"}' },
      }
      yield { type: 'content_block_stop', index: 0 }
      yield { type: 'content_block_start', index: 1, content_block: searchResultBlock }
      yield { type: 'content_block_stop', index: 1 }
      yield {
        type: 'message_delta',
        delta: { stop_reason: 'end_turn' },
        usage: { output_tokens: 500 },
      }
    },
    finalMessage: vi.fn(() =>
      Promise.resolve({
        stop_reason: 'end_turn',
        content: [
          { type: 'server_tool_use', id: 'srvtoolu_1', name: 'web_search', input: {} },
          searchResultBlock,
          {
            type: 'text',
            text: 'Answer',
            citations: [
              {
                type: 'web_search_result_location',
                url: 'https://example.com/a',
                title: 'A',
                encrypted_index: 'IDX',
                cited_text: 'quoted',
              },
            ],
          },
        ],
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
          server_tool_use: { web_search_requests: webSearchRequests },
        },
      })
    ),
  }
  vi.mocked(anthropic.messages.stream).mockResolvedValue(mockStream as never)
}

async function drain(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text()
  return text
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice(6)))
}

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: CHAT_ID, userMessage: 'Hello', ...body }),
    })
  )
}

function calledModel(): string {
  return vi.mocked(anthropic.messages.stream).mock.calls[0][0].model as string
}

function calledTools(): Array<{ type?: string; name?: string }> {
  return (vi.mocked(anthropic.messages.stream).mock.calls[0][0].tools ??
    []) as Array<{ type?: string; name?: string }>
}

function usageRow(captured: Captured) {
  return captured.inserts.find((row) => 'userId' in row && 'model' in row)
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Legacy model ids from already-installed extensions', () => {
  it('accepts claude-opus-4-6 and calls Opus 5.5 instead', async () => {
    primeRequestContext()
    mockPlainTurn(1000, 500)

    const response = await post({ model: 'claude-opus-4-6' })
    expect(response.status).toBe(200)
    await drain(response)

    expect(calledModel()).toBe('claude-opus-5-5')
  })

  it('accepts claude-sonnet-4-6 and calls Sonnet 5.5 instead', async () => {
    primeRequestContext()
    mockPlainTurn(1000, 500)

    const response = await post({ model: 'claude-sonnet-4-6' })
    expect(response.status).toBe(200)
    await drain(response)

    expect(calledModel()).toBe('claude-sonnet-5-5')
  })

  it('maps claude-haiku-4-5 from installed extensions to Haiku 5.5', async () => {
    primeRequestContext()
    mockPlainTurn(1000, 500)

    const response = await post({ model: 'claude-haiku-4-5' })
    expect(response.status).toBe(200)
    await drain(response)

    expect(calledModel()).toBe('claude-haiku-5-5')
  })

  it('bills a legacy id at the resolved model rate, not the legacy one', async () => {
    const captured = primeRequestContext()
    mockPlainTurn(1000, 500)

    const events = await drain(await post({ model: 'claude-opus-4-6' }))

    // Opus 5.5: (1000/1M x $4) + (500/1M x $20) = $0.014 -> x1.25 Margin = 1.75c -> 2 credits
    const expected = calculateCostInCredits('claude-opus-5-5', 1000, 500)
    expect(expected).toBe(2)

    const done = events.find((e) => e.type === 'done') as {
      usage: { costCents: number }
    }
    expect(done.usage.costCents).toBe(expected)
    expect(usageRow(captured)).toMatchObject({
      model: 'claude-opus-5-5',
      costCents: expected,
    })

    expect(writeRunRecord).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'claude-opus-5-5', usage: expect.objectContaining({ costCents: expected }) })
    )
  })

  it('records the resolved model and cost for every legacy alias', async () => {
    for (const [legacy, current] of Object.entries(LEGACY_MODEL_ALIASES)) {
      vi.clearAllMocks()
      const captured = primeRequestContext()
      mockPlainTurn(2000, 1000)

      await drain(await post({ model: legacy }))

      expect(calledModel()).toBe(current)
      expect(usageRow(captured)?.model).toBe(current)
      expect(usageRow(captured)?.costCents).toBe(
        calculateCostInCredits(current as ModelName, 2000, 1000)
      )
    }
  })

  it('deducts credits equal to the recorded cost', async () => {
    const captured = primeRequestContext()
    mockPlainTurn(1000, 500)

    await drain(await post({ model: 'claude-sonnet-4-6' }))

    const expected = calculateCostInCredits('claude-sonnet-5-5', 1000, 500)
    expect(settleCredits).toHaveBeenCalledWith(expect.objectContaining({ actualCents: expected }))
    expect(usageRow(captured)?.costCents).toBe(expected)
  })

  it('rejects a model id that was never shipped', async () => {
    primeRequestContext()

    const response = await post({ model: 'claude-sonnet-4-20250514' })

    expect(response.status).toBe(400)
  })
})

describe('Web search gating and billing', () => {
  it('does not send the web search tool by default', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', '')
    primeRequestContext()
    mockPlainTurn(1000, 500)

    await drain(await post({}))

    expect(calledTools().some((t) => t.type === 'web_search_20250305')).toBe(false)
  })

  it('stays dormant when requested but the kill switch is off', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', '')
    primeRequestContext()
    mockPlainTurn(1000, 500)

    await drain(await post({ enableWebSearch: true }))

    expect(calledTools().some((t) => t.type === 'web_search_20250305')).toBe(false)
  })

  it('sends the web search tool once enabled and requested', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    primeRequestContext()
    mockSearchTurn(1)

    await drain(await post({ enableWebSearch: true }))

    expect(calledTools().some((t) => t.type === 'web_search_20250305')).toBe(true)
    expect(calledTools().some((t) => t.name === 'take_snapshot')).toBe(true)
  })

  it('charges the per-search fee inside the credit deduction', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    const captured = primeRequestContext()
    mockSearchTurn(2)

    const events = await drain(await post({ enableWebSearch: true }))

    const expected = calculateCostInCredits('claude-haiku-5-5', 1000, 500, 2)
    expect(expected).toBeGreaterThan(
      calculateCostInCredits('claude-haiku-5-5', 1000, 500, 0)
    )

    const done = events.find((e) => e.type === 'done') as {
      usage: {
        costCents: number
        webSearchRequests: number
        webSearchCostCents: number
      }
    }
    expect(done.usage.costCents).toBe(expected)
    expect(done.usage.webSearchRequests).toBe(2)
    expect(done.usage.webSearchCostCents).toBe(calculateWebSearchCostInCredits(2))

    expect(usageRow(captured)?.costCents).toBe(expected)
    expect(settleCredits).toHaveBeenCalledWith(expect.objectContaining({ actualCents: expected }))
  })

  it('streams the query and its sources to the client', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    primeRequestContext()
    mockSearchTurn(1)

    const events = await drain(await post({ enableWebSearch: true }))

    const start = events.find((e) => e.type === 'web_search_start') as { query: string }
    expect(start.query).toBe('claude pricing')

    const results = events.find((e) => e.type === 'web_search_results') as {
      sources: unknown[]
    }
    expect(results.sources).toEqual([
      { url: 'https://example.com/a', title: 'A', pageAge: null },
    ])
  })

  it('never emits web search as an executable client tool_use', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    primeRequestContext()
    mockSearchTurn(1)

    const events = await drain(await post({ enableWebSearch: true }))

    expect(events.some((e) => e.type === 'tool_use')).toBe(false)
  })

  it('emits citations for the sources Claude quoted', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    primeRequestContext()
    mockSearchTurn(1)

    const events = await drain(await post({ enableWebSearch: true }))

    const citations = events.find((e) => e.type === 'citations') as {
      citations: unknown[]
    }
    expect(citations.citations).toEqual([
      { url: 'https://example.com/a', title: 'A', citedText: 'quoted' },
    ])
  })

  it('returns encrypted search blocks so the next turn can replay them', async () => {
    vi.stubEnv('ENABLE_WEB_SEARCH', 'true')
    primeRequestContext()
    mockSearchTurn(1)

    const events = await drain(await post({ enableWebSearch: true }))

    const done = events.find((e) => e.type === 'done') as {
      contentBlocks: Array<{ type: string; content?: Array<{ encrypted_content: string }> }>
    }
    const searchResult = done.contentBlocks.find(
      (b) => b.type === 'web_search_tool_result'
    )
    expect(searchResult?.content?.[0].encrypted_content).toBe('ENC')
  })
})
