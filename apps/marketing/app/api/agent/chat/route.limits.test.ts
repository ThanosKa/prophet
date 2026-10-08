import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import {
  AGENT_CHAT_URL,
  anthropicTurn,
  createTables,
  db,
  postAgentChat,
  postRaw,
  resetAs,
  seedUserWithChat,
  sentParams,
  streamMock,
  text,
} from './route-test-harness'

const USER_ID = 'user_limits'
const CHAT_ID = '3b8e1d4f-6a2c-4f9e-8d7b-5c1a2e3f4b6d'

beforeAll(createTables)

beforeEach(async () => {
  await resetAs(USER_ID)
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: 1_000_000 })
})

function post(body: Record<string, unknown>) {
  return postAgentChat({ chatId: CHAT_ID, ...body })
}

describe('request size in POST /api/agent/chat', () => {
  it('turns away a body whose Content-Length is over 4,000,000 bytes before reading it', async () => {
    const response = await postRaw(
      new Request(AGENT_CHAT_URL, {
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
    const request = new Request(AGENT_CHAT_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    expect(request.headers.get('content-length')).toBeNull()

    const response = await postRaw(request)

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'REQUEST_TOO_LARGE', error: expect.any(String) })
  })
})

const doneTurn = () => anthropicTurn({ content: [text('Done.')], stopReason: 'end_turn' })

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
    // A result this large puts both Turns over the Run budget, so each request ends with
    // the last-Turn notice; everything before it must still match byte for byte.
    const withoutNotice = (call: number) =>
      sentParams(call).messages.filter((message: { role: string }) => message.role !== 'system')
    const earlier = JSON.stringify(withoutNotice(0))
    const later = JSON.stringify(withoutNotice(1))
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

describe('chat context in POST /api/agent/chat', () => {
  async function storedContextTokens() {
    const chat = await db.query.chats.findFirst({ where: eq(schema.chats.id, CHAT_ID) })
    return chat?.contextTokens
  }

  it.each([
    ['a prompt past the old 200K clamp', 'claude-sonnet-5-5', 300_000, 300_050],
    ['a prompt past the 1M window', 'claude-haiku-5-5', 1_200_000, 1_000_000],
  ])('stores the context of %s, clamped by the model window', async (_label, model, cachedTokens, expected) => {
    streamMock.mockReturnValue(
      anthropicTurn({
        content: [text('Done.')],
        stopReason: 'end_turn',
        usage: { input_tokens: 0, cache_read_input_tokens: cachedTokens, output_tokens: 50 },
      })
    )

    const response = await post({ model, userMessage: 'Summarise this page' })
    await response.text()

    expect(response.status).toBe(200)
    expect(await storedContextTokens()).toBe(expected)
  })
})
