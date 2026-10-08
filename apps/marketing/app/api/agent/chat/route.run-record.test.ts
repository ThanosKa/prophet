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

const USER_ID = 'user_run_record'
const CHAT_ID = '5d2c8e4a-1b3f-4c7d-9e6a-2f1b0c3d4e5f'

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
  await db.insert(schema.users).values({ id: USER_ID, email: 'record@example.com', creditsRemaining: 1000 })
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

type ApiBlock = { type: string } & Record<string, unknown>
type Usage = { input_tokens: number; output_tokens: number }
const USAGE: Usage = { input_tokens: 1000, output_tokens: 50 }

/** The stream events Anthropic sends for one finished content block. */
function* blockEvents({ index, block }: { index: number; block: ApiBlock }) {
  if (block.type === 'tool_use') {
    yield { type: 'content_block_start', index, content_block: { ...block, input: {} } }
    yield {
      type: 'content_block_delta',
      index,
      delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) },
    }
  } else if (block.type === 'text') {
    yield { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }
    yield { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }
  } else {
    yield { type: 'content_block_start', index, content_block: block }
  }
  yield { type: 'content_block_stop', index }
}

function anthropicTurn({
  content,
  stopReason,
}: {
  content: ApiBlock[]
  stopReason: 'tool_use' | 'end_turn' | 'max_tokens' | 'refusal'
}) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { ...USAGE, output_tokens: 1 } } }
      for (const [index, block] of content.entries()) yield* blockEvents({ index, block })
      yield { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: USAGE.output_tokens } }
    },
    finalMessage: () =>
      Promise.resolve({
        stop_reason: stopReason,
        ...(stopReason === 'refusal' && {
          stop_details: { type: 'refusal', category: 'cyber', explanation: null },
        }),
        content,
        usage: USAGE,
      }),
  }
}

const text = (value: string): ApiBlock => ({ type: 'text', text: value })
const toolUse = ({ id, name, input }: { id: string; name: string; input: Record<string, unknown> }): ApiBlock => ({
  type: 'tool_use',
  id,
  name,
  input,
})

/** Streams some text, then fails the way `afterText` says. */
function interruptedTurn({ streamedText, afterText }: { streamedText: string; afterText: 'hang' | 'break' }) {
  streamMock.mockImplementationOnce((_params: unknown, options?: { signal?: AbortSignal }) => ({
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { ...USAGE, output_tokens: 1 } } }
      yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }
      yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: streamedText } }
      if (afterText === 'break') throw new Error('socket hang up')
      // Hangs until the route aborts upstream, which may already have happened.
      await new Promise((_resolve, reject) => {
        const signal = options?.signal
        if (!signal) return reject(new Error('no abort signal passed upstream'))
        if (signal.aborted) return reject(new Error('Request was aborted.'))
        signal.addEventListener('abort', () => reject(new Error('Request was aborted.')))
      })
    },
    finalMessage: () => new Promise(() => {}),
  }))
}

async function readUntil({ response, marker }: { response: Response; marker: string }) {
  if (!response.body) throw new Error('no response body')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let seen = ''
  while (!seen.includes(marker)) {
    const { value, done } = await reader.read()
    if (done) throw new Error(`stream ended before ${marker}`)
    seen += decoder.decode(value)
  }
  return reader
}

const OPENING_TURN = [text('Opening a.com.'), toolUse({ id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } })]
const OPENING_TURN_ECHO = {
  content: OPENING_TURN,
  toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Navigated' }],
}

/** Turn 1 of a Run: Claude opens a.com. */
async function openRunWithOneToolCall() {
  streamMock.mockReturnValueOnce(anthropicTurn({ content: OPENING_TURN, stopReason: 'tool_use' }))
  await (await post({ userMessage: 'Open a.com' })).text()
}

function sentParams(call: number) {
  const params = streamMock.mock.calls[call]?.[0]
  if (!params) throw new Error(`no Anthropic call #${call}`)
  return params
}

async function storedMessages() {
  const rows = await db.query.messages.findMany({
    where: eq(schema.messages.chatId, CHAT_ID),
    orderBy: [asc(schema.messages.createdAt)],
  })
  return rows.map(({ role, content, toolCalls }) => ({
    role,
    content,
    toolCalls: toolCalls === null ? null : JSON.parse(toolCalls),
  }))
}

describe('the Run progress record in POST /api/agent/chat', () => {
  it('keeps the user message when the first Turn fails with an Anthropic error', async () => {
    streamMock.mockRejectedValueOnce(new Error('529 {"type":"error","error":{"type":"overloaded_error"}}'))

    const response = await post({ userMessage: 'Open a.com' })
    await response.text()

    expect(await storedMessages()).toEqual([{ role: 'user', content: 'Open a.com', toolCalls: null }])
  })

  it('writes nothing when the balance cannot cover the Turn', async () => {
    await db.update(schema.users).set({ creditsRemaining: 0 }).where(eq(schema.users.id, USER_ID))

    const response = await post({ userMessage: 'Open a.com' })

    expect(response.status).toBe(402)
    expect(await storedMessages()).toEqual([])
  })
  it('stores the text and the released tool calls of a tool-use Turn in one assistant row', async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        content: [
          text('Opening a.com.'),
          toolUse({ id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }),
        ],
        stopReason: 'tool_use',
      })
    )

    await (await post({ userMessage: 'Open a.com' })).text()

    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }],
      },
    ])
  })
  it('keeps one assistant row across Turns and marks a call whose result was an error', async () => {
    const turn1 = [
      text('Opening a.com.'),
      toolUse({ id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }),
    ]
    streamMock
      .mockReturnValueOnce(anthropicTurn({ content: turn1, stopReason: 'tool_use' }))
      .mockReturnValueOnce(
        anthropicTurn({
          content: [text('Retrying.'), toolUse({ id: 'toolu_2', name: 'take_snapshot', input: {} })],
          stopReason: 'tool_use',
        })
      )

    await (await post({ userMessage: 'Open a.com' })).text()
    await (
      await post({
        previousTurns: [
          {
            content: turn1,
            toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Timed out', is_error: true }],
          },
        ],
      })
    ).text()

    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.\nRetrying.',
        toolCalls: [
          { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' }, isError: true },
          { type: 'tool_use', id: 'toolu_2', name: 'take_snapshot', input: {} },
        ],
      },
    ])
  })
  it('saves the text streamed before a Stop next to the earlier Turns', async () => {
    await openRunWithOneToolCall()
    interruptedTurn({ streamedText: 'The page shows', afterText: 'hang' })

    // The side panel's Stop cancels the response body.
    const response = await post({ previousTurns: [OPENING_TURN_ECHO] })
    const reader = await readUntil({ response, marker: 'content_delta' })
    await reader.cancel()

    await vi.waitFor(async () =>
      expect(await storedMessages()).toEqual([
        { role: 'user', content: 'Open a.com', toolCalls: null },
        {
          role: 'assistant',
          content: 'Opening a.com.\nThe page shows',
          toolCalls: [{ type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }],
        },
      ])
    )
  })

  it('saves the text streamed before a stream error next to the earlier Turns', async () => {
    await openRunWithOneToolCall()
    interruptedTurn({ streamedText: 'The page shows', afterText: 'break' })

    await (await post({ previousTurns: [OPENING_TURN_ECHO] })).text()

    await vi.waitFor(async () =>
      expect(await storedMessages()).toEqual([
        { role: 'user', content: 'Open a.com', toolCalls: null },
        {
          role: 'assistant',
          content: 'Opening a.com.\nThe page shows',
          toolCalls: [{ type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }],
        },
      ])
    )
  })

  it('replaces a refused Turn with the declined note and keeps the earlier Turns', async () => {
    await openRunWithOneToolCall()
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        content: [text('Running the exploit.'), toolUse({ id: 'toolu_2', name: 'click', input: { uid: '9' } })],
        stopReason: 'refusal',
      })
    )

    await (await post({ previousTurns: [OPENING_TURN_ECHO] })).text()

    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.\nClaude declined to continue this request.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }],
      },
    ])
  })

  it('never lets two legacy Runs in one chat overwrite each other', async () => {
    // Run A opens a.com in one panel; Run B is answered in another panel meanwhile.
    await openRunWithOneToolCall()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Hi there.')], stopReason: 'end_turn' }))
    await (await post({ userMessage: 'Hi' })).text()
    // Run A's next Turn, in the form builds older than 1.0.5 send...
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('a.com is open.')], stopReason: 'end_turn' }))
    await (
      await post({ previousContent: OPENING_TURN_ECHO.content, toolResults: OPENING_TURN_ECHO.toolResults })
    ).text()
    // ...and in the form 1.0.5 sends.
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('a.com is open.')], stopReason: 'end_turn' }))
    await (await post({ previousTurns: [OPENING_TURN_ECHO] })).text()

    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }],
      },
      { role: 'user', content: 'Hi', toolCalls: null },
      { role: 'assistant', content: 'Hi there.', toolCalls: null },
    ])
  })

  it('appends a legacy Turn to the stored record', async () => {
    await openRunWithOneToolCall()
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        content: [text('Reading it.'), toolUse({ id: 'toolu_2', name: 'take_snapshot', input: {} })],
        stopReason: 'tool_use',
      })
    )
    await (
      await post({
        previousContent: OPENING_TURN_ECHO.content,
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Blocked', is_error: true }],
      })
    ).text()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Done.')], stopReason: 'end_turn' }))
    await (
      await post({
        previousContent: [text('Reading it.'), toolUse({ id: 'toolu_2', name: 'take_snapshot', input: {} })],
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_2', content: 'snapshot' }],
      })
    ).text()

    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.\nReading it.\nDone.',
        toolCalls: [
          { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' }, isError: true },
          { type: 'tool_use', id: 'toolu_2', name: 'take_snapshot', input: {} },
        ],
      },
    ])
  })

  it("sends a later Run the earlier Run's text and the actions it took", async () => {
    await openRunWithOneToolCall()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('a.com is open.')], stopReason: 'end_turn' }))
    await (
      await post({
        previousTurns: [
          {
            content: OPENING_TURN,
            toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Blocked', is_error: true }],
          },
        ],
      })
    ).text()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Sure.')], stopReason: 'end_turn' }))

    await (await post({ userMessage: 'continue' })).text()

    expect(sentParams(2).messages).toEqual([
      { role: 'user', content: 'Open a.com' },
      {
        role: 'assistant',
        content: 'Opening a.com.\na.com is open.\n\nActions taken:\n- navigate {"url":"https://a.com"} (failed)',
      },
      { role: 'user', content: 'continue' },
    ])
  })

  it('caps the earlier text at its head and tail and each action input at 300 characters', async () => {
    await db.insert(schema.messages).values([
      { chatId: CHAT_ID, role: 'user', content: 'Search', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)) },
      {
        chatId: CHAT_ID,
        role: 'assistant',
        content: 'A'.repeat(5000) + 'B'.repeat(5000),
        toolCalls: JSON.stringify([
          { type: 'tool_use', id: 'toolu_1', name: 'search_snapshot', input: { query: 'q'.repeat(400) } },
        ]),
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 1)),
      },
    ])
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Sure.')], stopReason: 'end_turn' }))

    await (await post({ userMessage: 'continue' })).text()

    const inputJson = `{"query":"${'q'.repeat(400)}"}`
    expect(sentParams(0).messages[1]).toEqual({
      role: 'assistant',
      content:
        'A'.repeat(4000) +
        '\n[… 2000 characters left out …]\n' +
        'B'.repeat(4000) +
        `\n\nActions taken:\n- search_snapshot ${inputJson.slice(0, 300)}…`,
    })
  })

  it('ignores stored tool calls that are not a valid list', async () => {
    await db.insert(schema.messages).values([
      { chatId: CHAT_ID, role: 'user', content: 'Search', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)) },
      {
        chatId: CHAT_ID,
        role: 'assistant',
        content: 'Found it.',
        toolCalls: '[{"id":"toolu_1"}]',
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 1)),
      },
    ])
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Sure.')], stopReason: 'end_turn' }))

    await (await post({ userMessage: 'continue' })).text()

    expect(sentParams(0).messages[1]).toEqual({ role: 'assistant', content: 'Found it.' })
  })

  it('returns the whole Hold and answers 500 when the Run cannot start', async () => {
    await db.execute(sql`
      CREATE FUNCTION reject_message() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'messages are read-only'; END;
      $$ LANGUAGE plpgsql`)
    await db.execute(sql`
      CREATE TRIGGER reject_message BEFORE INSERT ON messages
      FOR EACH ROW EXECUTE FUNCTION reject_message()`)
    try {
      const response = await post({ userMessage: 'Open a.com' })

      expect(response.status).toBe(500)
      expect(await response.json()).toMatchObject({ code: 'INTERNAL_ERROR' })
      const user = await db.query.users.findFirst({ where: eq(schema.users.id, USER_ID) })
      expect(user?.creditsRemaining).toBe(1000)
      expect(streamMock).not.toHaveBeenCalled()
    } finally {
      await db.execute(sql`DROP TRIGGER reject_message ON messages`)
      await db.execute(sql`DROP FUNCTION reject_message()`)
    }
  })

  it("answers 404 for another user's chat and writes nothing", async () => {
    await db.insert(schema.users).values({ id: 'user_other', email: 'other@example.com', creditsRemaining: 1000 })
    await db.update(schema.chats).set({ userId: 'user_other' }).where(eq(schema.chats.id, CHAT_ID))

    const response = await post({ userMessage: 'Open a.com' })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ code: 'CHAT_NOT_FOUND' })
    expect(await storedMessages()).toEqual([])
    expect(streamMock).not.toHaveBeenCalled()
  })
})
