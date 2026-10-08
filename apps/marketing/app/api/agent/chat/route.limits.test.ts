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

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: vi.fn() }))
// A plain vi.fn, so tests can hand it stub streams without casting to MessageStream.
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

const USER_ID = 'user_limits'
const CHAT_ID = '3b8e1d4f-6a2c-4f9e-8d7b-5c1a2e3f4b6d'
const URL_ = 'http://localhost:3000/api/agent/chat'

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
  await db.insert(schema.users).values({ id: USER_ID, email: 'limits@example.com', creditsRemaining: 1_000_000 })
  await db.insert(schema.chats).values({ id: CHAT_ID, userId: USER_ID, title: 'Chat' })
})

function post(body: Record<string, unknown>) {
  return POST(
    new Request(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: CHAT_ID, ...body }),
    })
  )
}

describe('request size in POST /api/agent/chat', () => {
  it('turns away a body whose Content-Length is over 4,000,000 bytes before reading it', async () => {
    const response = await POST(
      new Request(URL_, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '4000001' },
        body: JSON.stringify({ chatId: CHAT_ID, userMessage: 'Hi' }),
      })
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'REQUEST_TOO_LARGE', error: expect.any(String) })
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('measures the body in bytes when there is no Content-Length', async () => {
    // 2,100,000 two-byte characters: under the limit in chars, over it in bytes.
    const body = JSON.stringify({ chatId: CHAT_ID, userMessage: 'é'.repeat(2_100_000) })
    const request = new Request(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    expect(request.headers.get('content-length')).toBeNull()

    const response = await POST(request)

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'REQUEST_TOO_LARGE', error: expect.any(String) })
  })
})

type ApiBlock = Record<string, unknown>
type StopReason = 'tool_use' | 'end_turn'
type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number }

/** One Anthropic response: streams `content`, then reports it from finalMessage(). */
function anthropicTurn({
  content,
  stopReason,
  usage = { input_tokens: 100, output_tokens: 50 },
}: {
  content: ApiBlock[]
  stopReason: StopReason
  usage?: Usage
}) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { ...usage, output_tokens: 1 } } }
      for (const [index, block] of content.entries()) {
        if (block.type === 'text') {
          yield { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }
          yield { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }
        } else {
          yield { type: 'content_block_start', index, content_block: block }
        }
        yield { type: 'content_block_stop', index }
      }
      yield { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: usage.output_tokens } }
    },
    finalMessage: () => Promise.resolve({ stop_reason: stopReason, content, usage }),
  }
}

const doneTurn = () => anthropicTurn({ content: [{ type: 'text', text: 'Done.' }], stopReason: 'end_turn' })

function sentParams(call = 0) {
  const params = streamMock.mock.calls[call]?.[0]
  if (!params) throw new Error(`no Anthropic call #${call}`)
  return params
}

/** A Turn that took a snapshot and got `snapshot` back, as the extension echoes it. */
function snapshotTurn({ id, snapshot }: { id: string; snapshot: string }) {
  return {
    content: [{ type: 'tool_use', id, name: 'take_snapshot', input: {} }],
    toolResults: [{ type: 'tool_result', tool_use_id: id, content: snapshot }],
  }
}

describe('field sizes in POST /api/agent/chat', () => {
  const hugeSnapshot = Array.from({ length: 25_000 }, (_, i) => `uid=${i} link "Invoice ${i}"`).join('\n')

  it('shortens an over-cap tool result the same way on consecutive Turns, so the prompt prefix holds', async () => {
    expect(hugeSnapshot.length).toBeGreaterThan(250_000)
    streamMock.mockReturnValueOnce(doneTurn()).mockReturnValueOnce(doneTurn())
    const first = snapshotTurn({ id: 'toolu_1', snapshot: hugeSnapshot })
    const second = snapshotTurn({ id: 'toolu_2', snapshot: 'uid=1 link "Invoice 1"' })

    const responses = [
      await post({ model: 'claude-haiku-5-5', previousTurns: [first] }),
      await post({ model: 'claude-haiku-5-5', previousTurns: [first, second] }),
    ]
    for (const response of responses) await response.text()

    expect(responses.map((response) => response.status)).toEqual([200, 200])
    const sentResult = (call: number) => sentParams(call).messages[1].content[0].content
    expect(sentResult(0).length).toBeLessThan(200_200)
    expect(sentResult(0).startsWith(hugeSnapshot.slice(0, 199_000))).toBe(true)
    expect(sentResult(0)).toMatch(/shortened/i)
    expect(sentResult(1)).toBe(sentResult(0))
    const earlier = JSON.stringify(sentParams(0).messages)
    const later = JSON.stringify(sentParams(1).messages)
    expect(later.startsWith(earlier.slice(0, -1))).toBe(true)
  })

  it.each([
    ['a text block over 200,000 chars', [{ type: 'text', text: 'a'.repeat(200_001) }]],
    [
      'a tool input over 100,000 chars of JSON',
      [{ type: 'tool_use', id: 'toolu_1', name: 'fill_element_by_uid', input: { uid: '4', value: 'v'.repeat(100_000) } }],
    ],
  ])('rejects a Turn with %s', async (_label, content) => {
    const response = await post({
      model: 'claude-haiku-5-5',
      previousTurns: [
        {
          content: [...content, { type: 'tool_use', id: 'toolu_2', name: 'take_snapshot', input: {} }],
          toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_2', content: 'uid=1 link "Inbox"' }],
        },
      ],
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('still answers a request shaped like extension 1.0.5 sends it with a 250K-char snapshot', async () => {
    streamMock.mockReturnValue(doneTurn())
    const snapshot = 'x'.repeat(250_000)
    // 1.0.5 sends its baked-in model id, no runId, and each Turn's server contentBlocks unchanged.
    const previousTurns = [
      {
        content: [
          { type: 'text', text: 'Reading the page.' },
          { type: 'tool_use', id: 'toolu_snap', name: 'take_snapshot', input: {}, caller: { type: 'direct' } },
        ],
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_snap', content: snapshot, is_error: false }],
      },
    ]

    const response = await post({ model: 'claude-haiku-4-5', enableThinking: false, enableWebSearch: false, previousTurns })
    await response.text()

    expect(response.status).toBe(200)
    expect(streamMock).toHaveBeenCalledOnce()
  })
})
