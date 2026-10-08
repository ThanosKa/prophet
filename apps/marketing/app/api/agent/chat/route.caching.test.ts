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
const { anthropic } = await import('@/lib/anthropic')

const USER_ID = 'user_cache'
const CHAT_ID = '6f1c2a5e-8b4d-4c7a-9e21-3d5f7a9b1c2e'

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
  await db.insert(schema.users).values({ id: USER_ID, email: 'cache@example.com', creditsRemaining: 10_000 })
  await db.insert(schema.chats).values({ id: CHAT_ID, userId: USER_ID, title: 'Chat' })
})

type ApiBlock = Record<string, unknown>

/** One Anthropic response: streams `content`, then reports it from finalMessage(). */
function anthropicTurn(content: ApiBlock[], stopReason: 'tool_use' | 'end_turn') {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { input_tokens: 100, output_tokens: 1 } } }
      for (const [index, block] of content.entries()) {
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
      yield { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: 50 } }
    },
    finalMessage: () =>
      Promise.resolve({
        stop_reason: stopReason,
        content,
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
  }
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

function sentParams(call = 0) {
  const params = vi.mocked(anthropic.messages.stream).mock.calls[call]?.[0]
  if (!params) throw new Error(`no Anthropic call #${call}`)
  return params
}

describe('prompt caching in POST /api/agent/chat', () => {
  it('caches the static prefix explicitly and the growing conversation automatically', async () => {
    vi.mocked(anthropic.messages.stream).mockReturnValue(
      anthropicTurn([{ type: 'text', text: 'Hi' }], 'end_turn') as never
    )

    const response = await post({ userMessage: 'Hello', model: 'claude-sonnet-5-5' })
    await response.text()

    const params = sentParams()
    expect(params.cache_control).toEqual({ type: 'ephemeral' })
    expect(params.system).toEqual([
      expect.objectContaining({ type: 'text', cache_control: { type: 'ephemeral' } }),
    ])
  })
})

const NAVIGATE_TURN = {
  content: [
    { type: 'text', text: 'Opening your inbox.' },
    { type: 'tool_use', id: 'toolu_1', name: 'navigate', input: { url: 'https://mail.google.com/' } },
  ],
  toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Navigated to Inbox' }],
}

const SNAPSHOT_TURN = {
  content: [{ type: 'tool_use', id: 'toolu_2', name: 'take_snapshot', input: {} }],
  toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_2', content: 'uid=1 link "Invoice March"' }],
}

async function seedEarlierExchange() {
  await db.insert(schema.messages).values([
    { chatId: CHAT_ID, role: 'user', content: 'Earlier question', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)) },
    { chatId: CHAT_ID, role: 'assistant', content: 'Earlier answer', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 1)) },
  ])
}

/** Drives three requests of one agent run the way the extension sends them. */
async function runThreeTurns(extra: Record<string, unknown> = {}) {
  vi.mocked(anthropic.messages.stream)
    .mockReturnValueOnce(anthropicTurn(NAVIGATE_TURN.content, 'tool_use') as never)
    .mockReturnValueOnce(anthropicTurn(SNAPSHOT_TURN.content, 'tool_use') as never)
    .mockReturnValueOnce(anthropicTurn([{ type: 'text', text: 'Found it.' }], 'end_turn') as never)

  for (const body of [
    { userMessage: 'Open my inbox', ...extra },
    { previousTurns: [NAVIGATE_TURN], ...extra },
    { previousTurns: [NAVIGATE_TURN, SNAPSHOT_TURN], ...extra },
  ]) {
    const response = await post({ model: 'claude-sonnet-5-5', ...body })
    expect(response.status).toBe(200)
    await response.text()
  }
}

describe('append-only agent runs in POST /api/agent/chat', () => {
  it('sends every earlier turn of the run, so the model still sees its first observations', async () => {
    await seedEarlierExchange()

    await runThreeTurns()

    expect(sentParams(2).messages).toEqual([
      { role: 'user', content: 'Earlier question' },
      { role: 'assistant', content: 'Earlier answer' },
      { role: 'user', content: 'Open my inbox' },
      { role: 'assistant', content: NAVIGATE_TURN.content },
      { role: 'user', content: NAVIGATE_TURN.toolResults },
      { role: 'assistant', content: SNAPSHOT_TURN.content },
      { role: 'user', content: SNAPSHOT_TURN.toolResults },
    ])
  })

  it('keeps the attached screenshot in the run\'s opening message on every turn', async () => {
    await runThreeTurns({ image: { base64: 'iVBORw0KGgo=', mediaType: 'image/png' } })

    const opening = {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'iVBORw0KGgo=' } },
        { type: 'text', text: 'Open my inbox' },
      ],
    }
    for (const call of [0, 1, 2]) {
      expect(sentParams(call).messages[0]).toEqual(opening)
    }
  })

  it('hands back signed thinking blocks and replays them unchanged on the next turn', async () => {
    const thinking = { type: 'thinking', thinking: 'The inbox link is uid=4.', signature: 'sig-abc' }
    const redacted = { type: 'redacted_thinking', data: 'opaque-xyz' }
    const toolUse = { type: 'tool_use', id: 'toolu_9', name: 'click_element_by_uid', input: { uid: '4' } }
    vi.mocked(anthropic.messages.stream)
      .mockReturnValueOnce(anthropicTurn([thinking, redacted, toolUse], 'tool_use') as never)
      .mockReturnValueOnce(anthropicTurn([{ type: 'text', text: 'Done.' }], 'end_turn') as never)

    const first = await post({ userMessage: 'Open my inbox', model: 'claude-opus-5-5', enableThinking: true })
    const done = (await first.text())
      .split('\n\n')
      .map((frame) => frame.replace(/^data: /, ''))
      .filter((data) => data.includes('"type":"done"'))
      .map((data) => JSON.parse(data))[0]
    const second = await post({
      model: 'claude-opus-5-5',
      enableThinking: true,
      previousTurns: [
        {
          content: done.contentBlocks,
          toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_9', content: 'Clicked' }],
        },
      ],
    })
    await second.text()

    expect(second.status).toBe(200)
    expect(sentParams(1).messages.at(-2)).toEqual({
      role: 'assistant',
      content: [thinking, redacted, toolUse],
    })
  })

  it('rejects a run history whose tool results answer no tool call of that turn', async () => {
    const response = await post({
      model: 'claude-sonnet-5-5',
      previousTurns: [
        {
          content: NAVIGATE_TURN.content,
          toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_forged', content: 'Navigated' }],
        },
      ],
    })

    expect(response.status).toBe(400)
    expect(anthropic.messages.stream).not.toHaveBeenCalled()
  })

  it.each([
    [10, 'an older build that pauses at 10 Turns'],
    [19, 'the last request of a 20-Turn run'],
  ])('accepts a run history of %i earlier Turns (%s)', async (earlierTurns) => {
    streamMock.mockReturnValue(
      anthropicTurn([{ type: 'text', text: 'Done.' }], 'end_turn')
    )

    const response = await post({
      model: 'claude-sonnet-5-5',
      previousTurns: Array.from({ length: earlierTurns }, () => NAVIGATE_TURN),
    })
    await response.text()

    expect(response.status).toBe(200)
    expect(anthropic.messages.stream).toHaveBeenCalledOnce()
  })

  it('rejects a run history longer than an agent run can be', async () => {
    const response = await post({
      model: 'claude-sonnet-5-5',
      previousTurns: Array.from({ length: 21 }, () => NAVIGATE_TURN),
    })

    expect(response.status).toBe(400)
    expect(anthropic.messages.stream).not.toHaveBeenCalled()
  })

  it('keeps model, tools, system, thinking and effort identical on every turn of a run', async () => {
    await runThreeTurns({ enableThinking: true })

    const cacheKeyParams = (call: number) => {
      const { model, tools, system, thinking, output_config, cache_control } = sentParams(call)
      return JSON.stringify({ model, tools, system, thinking, output_config, cache_control })
    }
    expect(cacheKeyParams(1)).toBe(cacheKeyParams(0))
    expect(cacheKeyParams(2)).toBe(cacheKeyParams(0))
  })

  it('only ever appends: each request starts with the previous request, byte for byte', async () => {
    await seedEarlierExchange()

    await runThreeTurns()

    for (const call of [0, 1]) {
      const earlier = JSON.stringify(sentParams(call).messages)
      const later = JSON.stringify(sentParams(call + 1).messages)
      expect(later.startsWith(earlier.slice(0, -1))).toBe(true)
    }
  })
})

describe('echoed tool calls in POST /api/agent/chat', () => {
  /** A run history with one Turn that made `toolUse`, as the extension echoes it back. */
  function echoing(toolUse: ApiBlock) {
    return [
      {
        content: [toolUse],
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_echo', content: 'Done', is_error: false }],
      },
    ]
  }

  it.each([
    ['negative scroll pixels', 'scroll_page', { direction: 'down', pixels: -500 }],
    ['a wait over the 30s the tool clamps to', 'wait_for_timeout', { ms: 90000 }],
    ['a fractional wait', 'wait_for_timeout', { ms: 1500.5 }],
    ['a URL without a scheme', 'navigate', { url: 'example.com/inbox' }],
    ['a new tab URL without a scheme', 'open_new_tab', { url: 'example.com/inbox', active: true }],
    ['a snapshot search over 500 chars', 'search_snapshot', { query: 'invoice '.repeat(200) }],
  ])('accepts an echoed tool call with %s', async (_label, name, input) => {
    streamMock.mockReturnValue(anthropicTurn([{ type: 'text', text: 'Done.' }], 'end_turn'))
    const toolUse = { type: 'tool_use', id: 'toolu_echo', name, input }

    const response = await post({ model: 'claude-sonnet-5-5', previousTurns: echoing(toolUse) })
    await response.text()

    expect(response.status).toBe(200)
    expect(sentParams().messages.at(-2)).toEqual({ role: 'assistant', content: [toolUse] })
  })

  it('still accepts a continuation shaped like extension 1.0.5 sends it', async () => {
    streamMock.mockReturnValue(anthropicTurn([{ type: 'text', text: 'Done.' }], 'end_turn'))
    // 1.0.5 sends its baked-in model id, no runId, and each Turn's server contentBlocks unchanged.
    const previousTurns = [
      {
        content: [
          { type: 'thinking', thinking: 'Scroll to find the invoice.', signature: 'sig-1' },
          { type: 'text', text: 'Scrolling down.' },
          { type: 'tool_use', id: 'toolu_a', name: 'scroll_page', input: { direction: 'down', pixels: 20000 }, caller: { type: 'direct' } },
        ],
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_a', content: 'Scrolled down by 20000px', is_error: false }],
      },
      {
        content: [
          { type: 'thinking', thinking: 'Wait for the list to load.', signature: 'sig-2' },
          { type: 'tool_use', id: 'toolu_b', name: 'wait_for_timeout', input: { ms: 90000 }, caller: { type: 'direct' } },
        ],
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_b', content: 'Tool execution failed', is_error: true }],
      },
    ]

    const response = await post({ model: 'claude-haiku-4-5', enableThinking: true, previousTurns })
    await response.text()

    expect(response.status).toBe(200)
    expect(sentParams().model).toBe('claude-haiku-5-5')
    expect(sentParams().messages.slice(-4)).toEqual([
      { role: 'assistant', content: previousTurns[0].content },
      { role: 'user', content: previousTurns[0].toolResults },
      { role: 'assistant', content: previousTurns[1].content },
      { role: 'user', content: previousTurns[1].toolResults },
    ])
  })

  it.each([
    ['a direct caller', { type: 'direct' }],
    ['a caller type the schema has never seen', { type: 'code_execution_20270101', tool_id: 'srvtoolu_7' }],
  ])('hands an echoed tool call with %s to Anthropic with its caller intact', async (_label, caller) => {
    streamMock.mockReturnValue(anthropicTurn([{ type: 'text', text: 'Done.' }], 'end_turn'))
    const toolUse = { type: 'tool_use', id: 'toolu_echo', name: 'take_snapshot', input: {}, caller }

    const response = await post({ model: 'claude-sonnet-5-5', previousTurns: echoing(toolUse) })
    await response.text()

    expect(response.status).toBe(200)
    expect(sentParams().messages.at(-2)).toEqual({ role: 'assistant', content: [toolUse] })
  })
})
