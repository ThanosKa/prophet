import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { asc, eq, sql } from 'drizzle-orm'
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
const { streamMock } = vi.hoisted(() => ({ streamMock: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({ anthropic: { messages: { stream: streamMock } } }))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/dev-logger', () => ({
  devLogger: { logRequest: vi.fn(), logResponse: vi.fn() },
}))

const { db } = await import('@/lib/db')
const { auth } = await import('@clerk/nextjs/server')
const { checkRateLimit } = await import('@/lib/ratelimit')

const USER_ID = 'user_tool_release'
const CHAT_ID = '3c9e1b7a-2d4f-4a6b-9c8d-1e2f3a4b5c6d'
const STARTING_CREDITS = 1000

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
  await db.insert(schema.users).values({
    id: USER_ID,
    email: 'release@example.com',
    creditsRemaining: STARTING_CREDITS,
  })
  await db.insert(schema.chats).values({ id: CHAT_ID, userId: USER_ID, title: 'Chat' })
})

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: CHAT_ID, model: 'claude-haiku-5-5', ...body }),
    })
  )
}

type Frame = { type: string } & Record<string, unknown>

function isFrame(value: unknown): value is Frame {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
}

function frames(events: string): Frame[] {
  return events
    .split('\n\n')
    .filter(Boolean)
    .map((frame) => JSON.parse(frame.replace(/^data: /, '')))
    .filter(isFrame)
}

function framesOfType(events: Frame[], type: string): Frame[] {
  return events.filter((event) => event.type === type)
}

async function storedMessages() {
  return db.query.messages.findMany({
    where: eq(schema.messages.chatId, CHAT_ID),
    orderBy: [asc(schema.messages.createdAt)],
  })
}

async function balance(): Promise<number | undefined> {
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, USER_ID) })
  return row?.creditsRemaining
}

type Usage = { input_tokens: number; output_tokens: number }

/** One streamed text block: start, a single delta, stop. */
function* textBlock({ index, text }: { index: number; text: string }) {
  yield { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }
  yield { type: 'content_block_delta', index, delta: { type: 'text_delta', text } }
  yield { type: 'content_block_stop', index }
}

/** One streamed client tool call; `partialJson` lets a test cut the input off mid-way. */
function* toolUseBlock({
  index,
  id,
  name,
  partialJson,
}: {
  index: number
  id: string
  name: string
  partialJson: string
}) {
  yield { type: 'content_block_start', index, content_block: { type: 'tool_use', id, name, input: {} } }
  yield { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: partialJson } }
  yield { type: 'content_block_stop', index }
}

function anthropicTurn({
  blocks,
  stopReason,
  content,
  usage = { input_tokens: 1000, output_tokens: 50 },
}: {
  blocks: Array<Record<string, unknown>>
  stopReason: 'tool_use' | 'end_turn' | 'max_tokens' | 'refusal'
  content: Array<Record<string, unknown>>
  usage?: Usage
}) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { ...usage, output_tokens: 1 } } }
      yield* blocks
      yield { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: usage.output_tokens } }
    },
    finalMessage: () =>
      Promise.resolve({
        stop_reason: stopReason,
        ...(stopReason === 'refusal' && {
          stop_details: { type: 'refusal', category: 'cyber', explanation: null },
        }),
        content,
        usage,
      }),
  }
}

describe('releasing client tool calls in POST /api/agent/chat', () => {
  it('sends the tool_use events after the last content event and before execution_complete when the Turn stops for tools', async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        blocks: [
          ...textBlock({ index: 0, text: 'Opening both tabs.' }),
          ...toolUseBlock({ index: 1, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://a.com"}' }),
          ...toolUseBlock({ index: 2, id: 'toolu_2', name: 'take_snapshot', partialJson: '' }),
        ],
        stopReason: 'tool_use',
        content: [
          { type: 'text', text: 'Opening both tabs.' },
          { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } },
          { type: 'tool_use', id: 'toolu_2', name: 'take_snapshot', input: {} },
        ],
      })
    )

    const events = frames(await (await post({ userMessage: 'Open a.com' })).text())

    expect(events.map((event) => event.type)).toEqual([
      'session_created',
      'content_delta',
      'metrics_update',
      'tool_use',
      'tool_use',
      'execution_complete',
      'done',
    ])
    expect(framesOfType(events, 'tool_use').map((event) => event.toolUse)).toEqual([
      { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } },
      { type: 'tool_use', id: 'toolu_2', name: 'take_snapshot', input: {} },
    ])
  })

  it('releases no tool call when the stream breaks after a complete tool_use block', async () => {
    streamMock.mockReturnValueOnce({
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { usage: { input_tokens: 1000, output_tokens: 1 } } }
        yield* toolUseBlock({ index: 0, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://a.com"}' })
        throw new Error('socket hang up')
      },
      finalMessage: () => Promise.reject(new Error('socket hang up')),
    })

    const events = frames(await (await post({ userMessage: 'Open a.com' })).text())

    expect(framesOfType(events, 'tool_use')).toEqual([])
    expect(framesOfType(events, 'error')).toHaveLength(1)
  })

  it('on max_tokens sends no tool_use event, returns the content without the cut-off call and stores no tool call', async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        blocks: [
          ...textBlock({ index: 0, text: 'Opening the page.' }),
          ...toolUseBlock({ index: 1, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://exa' }),
        ],
        stopReason: 'max_tokens',
        content: [
          { type: 'text', text: 'Opening the page.' },
          { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: {} },
        ],
      })
    )

    const events = frames(await (await post({ userMessage: 'Open example.com' })).text())

    expect(framesOfType(events, 'tool_use')).toEqual([])
    const [done] = framesOfType(events, 'done')
    expect(done.stopReason).toBe('max_tokens')
    expect(done.contentBlocks).toEqual([{ type: 'text', text: 'Opening the page.' }])
    const stored = await storedMessages()
    expect(stored.map(({ role, content, toolCalls }) => ({ role, content, toolCalls }))).toEqual([
      { role: 'user', content: 'Open example.com', toolCalls: null },
      { role: 'assistant', content: 'Opening the page.', toolCalls: null },
    ])
  })

  it('on a refusal after a tool_use block sends no tool_use event, stores no reply and bills the real cost', async () => {
    // Haiku 5.5: 90,000 input x $0.10/MTok + 10,000 output x $0.50/MTok = 1.4 cents,
    // x1.25 Margin = 1.75, rounded up to 2 Credits.
    const usage = { input_tokens: 90_000, output_tokens: 10_000 }
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        blocks: [
          ...textBlock({ index: 0, text: 'Running the exploit now.' }),
          ...toolUseBlock({ index: 1, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://a.com"}' }),
        ],
        stopReason: 'refusal',
        content: [
          { type: 'text', text: 'Running the exploit now.' },
          { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } },
        ],
        usage,
      })
    )

    const events = frames(await (await post({ userMessage: 'Hack a.com' })).text())

    expect(framesOfType(events, 'tool_use')).toEqual([])
    expect(framesOfType(events, 'error')).toEqual([
      {
        type: 'error',
        error: 'Claude declined this request. Try rephrasing it or start a new chat.',
        code: 'MODEL_REFUSED',
      },
    ])
    expect(framesOfType(events, 'done')).toEqual([])
    const stored = await storedMessages()
    expect(stored.filter((message) => message.role === 'assistant')).toEqual([])
    expect(await balance()).toBe(STARTING_CREDITS - 2)
  })
})
