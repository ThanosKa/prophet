import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  anthropicTurn,
  balance as balanceOf,
  createTables,
  frames,
  postAgentChat,
  resetAs,
  seedUserWithChat,
  storedMessages as storedMessagesOf,
  streamMock,
  text,
  textBlockEvents,
  toolUse,
  toolUseBlockEvents,
  type Frame,
} from './route-test-harness'

const USER_ID = 'user_tool_release'
const CHAT_ID = '3c9e1b7a-2d4f-4a6b-9c8d-1e2f3a4b5c6d'
const STARTING_CREDITS = 1000

beforeAll(createTables)

beforeEach(async () => {
  await resetAs(USER_ID)
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: STARTING_CREDITS })
})

function post(body: Record<string, unknown>) {
  return postAgentChat({ chatId: CHAT_ID, model: 'claude-haiku-5-5', ...body })
}

function framesOfType(events: Frame[], type: string): Frame[] {
  return events.filter((event) => event.type === type)
}

const storedMessages = () => storedMessagesOf(CHAT_ID)
const balance = () => balanceOf(USER_ID)

describe('releasing client tool calls in POST /api/agent/chat', () => {
  it('sends the tool_use events after the last content event and before execution_complete when the Turn stops for tools', async () => {
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        events: [
          ...textBlockEvents({ index: 0, value: 'Opening both tabs.' }),
          ...toolUseBlockEvents({ index: 1, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://a.com"}' }),
          ...toolUseBlockEvents({ index: 2, id: 'toolu_2', name: 'take_snapshot', partialJson: '' }),
        ],
        stopReason: 'tool_use',
        content: [
          text('Opening both tabs.'),
          toolUse({ id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }),
          toolUse({ id: 'toolu_2', name: 'take_snapshot', input: {} }),
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
        yield* toolUseBlockEvents({ index: 0, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://a.com"}' })
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
        events: [
          ...textBlockEvents({ index: 0, value: 'Opening the page.' }),
          ...toolUseBlockEvents({ index: 1, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://exa' }),
        ],
        stopReason: 'max_tokens',
        content: [
          text('Opening the page.'),
          toolUse({ id: 'toolu_1', name: 'navigate', input: {} }),
        ],
      })
    )

    const events = frames(await (await post({ userMessage: 'Open example.com' })).text())

    expect(framesOfType(events, 'tool_use')).toEqual([])
    const [done] = framesOfType(events, 'done')
    expect(done.stopReason).toBe('max_tokens')
    expect(done.contentBlocks).toEqual([text('Opening the page.')])
    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open example.com', toolCalls: null },
      { role: 'assistant', content: 'Opening the page.', toolCalls: null },
    ])
  })

  it('on a refusal after a tool_use block sends no tool_use event, stores only the declined note and bills the real cost', async () => {
    // Haiku 5.5: 90,000 input x $0.10/MTok + 10,000 output x $0.50/MTok = 1.4 cents,
    // x1.25 Margin = 1.75, rounded up to 2 Credits.
    const usage = { input_tokens: 90_000, output_tokens: 10_000 }
    streamMock.mockReturnValueOnce(
      anthropicTurn({
        events: [
          ...textBlockEvents({ index: 0, value: 'Running the exploit now.' }),
          ...toolUseBlockEvents({ index: 1, id: 'toolu_1', name: 'navigate', partialJson: '{"url":"https://a.com"}' }),
        ],
        stopReason: 'refusal',
        content: [
          text('Running the exploit now.'),
          toolUse({ id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } }),
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
    expect(
      stored
        .filter((message) => message.role === 'assistant')
        .map(({ content, toolCalls }) => ({ content, toolCalls }))
    ).toEqual([{ content: 'Claude declined to continue this request.', toolCalls: null }])
    expect(await balance()).toBe(STARTING_CREDITS - 2)
  })
})
