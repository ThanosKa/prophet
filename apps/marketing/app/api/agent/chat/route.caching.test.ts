import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import * as schema from '@/lib/db/schema'
import {
  anthropicTurn as harnessTurn,
  createTables,
  db,
  postAgentChat,
  resetAs,
  seedUserWithChat,
  sentParams,
  streamMock,
  type ApiBlock,
} from './route-test-harness'

const USER_ID = 'user_cache'
const CHAT_ID = '6f1c2a5e-8b4d-4c7a-9e21-3d5f7a9b1c2e'

beforeAll(createTables)

beforeEach(async () => {
  await resetAs(USER_ID)
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: 10_000 })
})

/** One Anthropic response: streams `content`, then reports it from finalMessage(). */
function anthropicTurn(content: ApiBlock[], stopReason: 'tool_use' | 'end_turn') {
  return harnessTurn({ content, stopReason, usage: { input_tokens: 100, output_tokens: 50 } })
}

function post(body: Record<string, unknown>) {
  return postAgentChat({ chatId: CHAT_ID, ...body })
}

describe('prompt caching in POST /api/agent/chat', () => {
  it('caches the static prefix explicitly and the growing conversation automatically', async () => {
    streamMock.mockReturnValue(anthropicTurn([{ type: 'text', text: 'Hi' }], 'end_turn'))

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
  streamMock
    .mockReturnValueOnce(anthropicTurn(NAVIGATE_TURN.content, 'tool_use'))
    .mockReturnValueOnce(anthropicTurn(SNAPSHOT_TURN.content, 'tool_use'))
    .mockReturnValueOnce(anthropicTurn([{ type: 'text', text: 'Found it.' }], 'end_turn'))

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
    streamMock
      .mockReturnValueOnce(anthropicTurn([thinking, redacted, toolUse], 'tool_use'))
      .mockReturnValueOnce(anthropicTurn([{ type: 'text', text: 'Done.' }], 'end_turn'))

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
    expect(streamMock).not.toHaveBeenCalled()
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
    expect(streamMock).toHaveBeenCalledOnce()
  })

  it('rejects a run history longer than an agent run can be', async () => {
    const response = await post({
      model: 'claude-sonnet-5-5',
      previousTurns: Array.from({ length: 21 }, () => NAVIGATE_TURN),
    })

    expect(response.status).toBe(400)
    expect(streamMock).not.toHaveBeenCalled()
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
