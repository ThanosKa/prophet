import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { and, eq } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import {
  anthropicTurn,
  balance as balanceOf,
  createTables,
  db,
  frames,
  openableGate,
  postAgentChat,
  readToEnd,
  readUntil,
  resetAs,
  seedUserWithChat,
  sentParams,
  storedMessages as storedMessagesOf,
  streamMock,
  text,
  toolUse,
  type ApiBlock,
} from './route-test-harness'

const USER_ID = 'user_live_run'
const CHAT_ID = '8b3e1d2c-4a5f-4e6d-9c7b-1a2b3c4d5e6f'

beforeAll(createTables)

beforeEach(async () => {
  await resetAs(USER_ID)
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: 1000 })
})

function post(body: Record<string, unknown>) {
  return postAgentChat({ chatId: CHAT_ID, model: 'claude-haiku-5-5', ...body })
}

const navigate = ({ id, url }: { id: string; url: string }): ApiBlock =>
  toolUse({ id, name: 'navigate', input: { url } })

const A_TURN_1 = [text('Opening a.com.'), navigate({ id: 'toolu_a1', url: 'https://a.com' })]
const A_TURN_1_ECHO = {
  content: A_TURN_1,
  toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_a1', content: 'Navigated' }],
}
const B_TURN_1 = [text('Opening b.com.'), navigate({ id: 'toolu_b1', url: 'https://b.com' })]
const B_TURN_1_ECHO = {
  content: B_TURN_1,
  toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_b1', content: 'Navigated' }],
}

async function sessionCreated(response: Response) {
  const frame = frames(await response.text()).find((event) => event.type === 'session_created')
  if (!frame) throw new Error('no session_created event')
  return frame
}

async function runIdOf(response: Response): Promise<string> {
  const { runId } = await sessionCreated(response)
  if (typeof runId !== 'string') throw new Error('session_created carries no runId')
  return runId
}

async function storedMessages() {
  return storedMessagesOf(CHAT_ID)
}

async function openingRowId(content: string) {
  const row = await db.query.messages.findFirst({
    where: and(eq(schema.messages.chatId, CHAT_ID), eq(schema.messages.content, content)),
  })
  if (!row) throw new Error(`no row "${content}"`)
  return row.id
}

const balance = () => balanceOf(USER_ID)

/** Run A opens a.com, then Run B opens b.com in another panel. Returns A's runId. */
async function runAThenRunB() {
  streamMock.mockReturnValueOnce(anthropicTurn({ content: A_TURN_1, stopReason: 'tool_use' }))
  const runA = await runIdOf(await post({ userMessage: 'Open a.com' }))
  streamMock.mockReturnValueOnce(anthropicTurn({ content: B_TURN_1, stopReason: 'tool_use' }))
  const runB = await runIdOf(await post({ userMessage: 'Open b.com' }))
  return { runA, runB }
}

/**
 * Run A finishes Turn 1, and its Turn 2 is still streaming when Run B starts in another
 * panel. A's Turn 2 ends while B's Turn 1 is still streaming; then B's Turn 1 ends.
 */
async function aTurn2EndsWhileBStreams() {
  streamMock.mockReturnValueOnce(anthropicTurn({ content: A_TURN_1, stopReason: 'tool_use' }))
  const runA = await runIdOf(await post({ userMessage: 'Open a.com' }))
  const aGate = openableGate()
  streamMock.mockReturnValueOnce(
    anthropicTurn({
      content: [text('a.com is open.'), navigate({ id: 'toolu_a2', url: 'https://a.com/cart' })],
      stopReason: 'tool_use',
      gate: aGate.gate,
    })
  )
  const aTurn2 = await readUntil({
    response: await post({ runId: runA, previousTurns: [A_TURN_1_ECHO] }),
    marker: 'content_delta',
  })
  const bGate = openableGate()
  streamMock.mockReturnValueOnce(anthropicTurn({ content: B_TURN_1, stopReason: 'tool_use', gate: bGate.gate }))
  const bTurn1 = await readUntil({ response: await post({ userMessage: 'Open b.com' }), marker: 'content_delta' })

  aGate.open()
  await readToEnd(aTurn2.reader)
  bGate.open()
  await readToEnd(bTurn1.reader)
  return { runA, runB: await openingRowId('Open b.com') }
}

describe('one live Run per chat in POST /api/agent/chat', () => {
  it("names the Run in session_created by its opening message's id", async () => {
    streamMock.mockReturnValueOnce(anthropicTurn({ content: A_TURN_1, stopReason: 'tool_use' }))

    const runId = await runIdOf(await post({ userMessage: 'Open a.com' }))

    expect(runId).toBe(await openingRowId('Open a.com'))
  })

  it('answers 409 RUN_SUPERSEDED to an older Run, before any Hold or record write', async () => {
    const { runA } = await runAThenRunB()
    const rowsBefore = await storedMessages()
    const balanceBefore = await balance()

    const response = await post({ runId: runA, previousTurns: [A_TURN_1_ECHO] })

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: 'RUN_SUPERSEDED',
      error: expect.stringContaining('another'),
    })
    expect(streamMock).toHaveBeenCalledTimes(2)
    expect(await balance()).toBe(balanceBefore)
    expect(await storedMessages()).toEqual(rowsBefore)
  })

  it("settles an older Run's in-flight Turn but leaves its record alone", async () => {
    await aTurn2EndsWhileBStreams()

    // Every Turn is billed at its real cost and no Hold is left behind.
    const usage = await db.select().from(schema.usageRecords)
    expect(usage).toHaveLength(3)
    expect(usage.every((record) => record.costCents > 0)).toBe(true)
    expect(await balance()).toBe(1000 - usage.reduce((sum, record) => sum + record.costCents, 0))
    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_a1', name: 'navigate', input: { url: 'https://a.com' } }],
      },
      { role: 'user', content: 'Open b.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening b.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_b1', name: 'navigate', input: { url: 'https://b.com' } }],
      },
    ])
  })

  it('names the Run again in the session_created of its continuation', async () => {
    const { runB } = await runAThenRunB()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('b.com is open.')], stopReason: 'end_turn' }))

    expect(await runIdOf(await post({ runId: runB, previousTurns: [B_TURN_1_ECHO] }))).toBe(runB)
  })

  it("leaves the record alone when an older Run's first Turn ends after a newer Run started", async () => {
    const aGate = openableGate()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: A_TURN_1, stopReason: 'tool_use', gate: aGate.gate }))
    const aTurn1 = await readUntil({ response: await post({ userMessage: 'Open a.com' }), marker: 'content_delta' })
    const bGate = openableGate()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: B_TURN_1, stopReason: 'tool_use', gate: bGate.gate }))
    const bTurn1 = await readUntil({ response: await post({ userMessage: 'Open b.com' }), marker: 'content_delta' })

    aGate.open()
    await readToEnd(aTurn1.reader)
    bGate.open()
    await readToEnd(bTurn1.reader)

    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      { role: 'user', content: 'Open b.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening b.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_b1', name: 'navigate', input: { url: 'https://b.com' } }],
      },
    ])
    expect(await db.select().from(schema.usageRecords)).toHaveLength(2)
  })

  it("leaves the record alone when an older Run's Turn is stopped after a newer Run started", async () => {
    streamMock.mockReturnValueOnce(anthropicTurn({ content: A_TURN_1, stopReason: 'tool_use' }))
    const runA = await runIdOf(await post({ userMessage: 'Open a.com' }))
    const aGate = openableGate()
    streamMock.mockReturnValueOnce(
      anthropicTurn({ content: [text('a.com is open.')], stopReason: 'end_turn', gate: aGate.gate })
    )
    const aTurn2 = await readUntil({
      response: await post({ runId: runA, previousTurns: [A_TURN_1_ECHO] }),
      marker: 'content_delta',
    })
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Hi there.')], stopReason: 'end_turn' }))
    await (await post({ userMessage: 'Hi' })).text()

    // The side panel's Stop cancels the response body.
    await aTurn2.reader.cancel()
    aGate.open()

    await vi.waitFor(async () => expect(await db.select().from(schema.usageRecords)).toHaveLength(3))
    expect(await balance()).toBe(
      1000 - (await db.select().from(schema.usageRecords)).reduce((sum, record) => sum + record.costCents, 0)
    )
    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_a1', name: 'navigate', input: { url: 'https://a.com' } }],
      },
      { role: 'user', content: 'Hi', toolCalls: null },
      { role: 'assistant', content: 'Hi there.', toolCalls: null },
    ])
  })

  it('builds a continuation with runId from the rows up to and including its opening', async () => {
    // A row an older build saved for another Run after this Run had started.
    await db.insert(schema.messages).values([
      { chatId: CHAT_ID, role: 'user', content: 'Open a.com', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)) },
      { chatId: CHAT_ID, role: 'user', content: 'Open b.com', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 1)) },
      { chatId: CHAT_ID, role: 'assistant', content: 'a.com is open.', createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 2)) },
      {
        chatId: CHAT_ID,
        role: 'assistant',
        content: 'Opening b.com.',
        toolCalls: JSON.stringify([{ type: 'tool_use', id: 'toolu_b1', name: 'navigate', input: { url: 'https://b.com' } }]),
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, 3)),
      },
    ])
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('b.com is open.')], stopReason: 'end_turn' }))

    await (await post({ runId: await openingRowId('Open b.com'), previousTurns: [B_TURN_1_ECHO] })).text()

    expect(sentParams(0).messages.slice(0, 3)).toEqual([
      { role: 'user', content: 'Open a.com' },
      { role: 'user', content: 'Open b.com' },
      { role: 'assistant', content: B_TURN_1 },
    ])
  })

  it('keeps the earlier rules for a continuation without runId', async () => {
    // Extension 1.0.5 sends no runId: Run A goes on after Run B started, as before.
    const { runA } = await runAThenRunB()
    expect(runA).toBe(await openingRowId('Open a.com'))
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('a.com is open.')], stopReason: 'end_turn' }))

    const response = await post({ previousTurns: [A_TURN_1_ECHO] })
    const session = await sessionCreated(response)

    expect(response.status).toBe(200)
    expect(session).not.toHaveProperty('runId')
    // The newest user row is B's, whose row isn't A's: the record write is skipped.
    expect(await storedMessages()).toEqual([
      { role: 'user', content: 'Open a.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening a.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_a1', name: 'navigate', input: { url: 'https://a.com' } }],
      },
      { role: 'user', content: 'Open b.com', toolCalls: null },
      {
        role: 'assistant',
        content: 'Opening b.com.',
        toolCalls: [{ type: 'tool_use', id: 'toolu_b1', name: 'navigate', input: { url: 'https://b.com' } }],
      },
    ])
    expect(await db.select().from(schema.usageRecords)).toHaveLength(3)
    // Its prompt is still the whole chat minus a trailing assistant row.
    expect(sentParams(2).messages.map((message: { content: unknown }) => message.content).slice(0, 3)).toEqual([
      'Open a.com',
      'Opening a.com.\n\nActions taken:\n- navigate {"url":"https://a.com"}',
      'Open b.com',
    ])
  })

  it.each([
    ['previousTurns (1.0.5)', { previousTurns: [A_TURN_1_ECHO] }],
    ['previousContent (older builds)', { previousContent: A_TURN_1, toolResults: A_TURN_1_ECHO.toolResults }],
  ])(
    "keeps an older Run's continuation without runId out of a newer Run whose first Turn is streaming, via %s",
    async (_label, continuation) => {
      streamMock.mockReturnValueOnce(anthropicTurn({ content: A_TURN_1, stopReason: 'tool_use' }))
      await (await post({ userMessage: 'Open a.com' })).text()
      const bGate = openableGate()
      streamMock.mockReturnValueOnce(anthropicTurn({ content: B_TURN_1, stopReason: 'tool_use', gate: bGate.gate }))
      const bTurn1 = await readUntil({ response: await post({ userMessage: 'Open b.com' }), marker: 'content_delta' })

      // B's opening is the newest user row and B has no row yet when A's next Turn ends.
      streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('a.com is open.')], stopReason: 'end_turn' }))
      const aTurn2 = await post(continuation)
      await aTurn2.text()
      bGate.open()
      await readToEnd(bTurn1.reader)

      expect(aTurn2.status).toBe(200)
      expect(await storedMessages()).toEqual([
        { role: 'user', content: 'Open a.com', toolCalls: null },
        {
          role: 'assistant',
          content: 'Opening a.com.',
          toolCalls: [{ type: 'tool_use', id: 'toolu_a1', name: 'navigate', input: { url: 'https://a.com' } }],
        },
        { role: 'user', content: 'Open b.com', toolCalls: null },
        {
          role: 'assistant',
          content: 'Opening b.com.',
          toolCalls: [{ type: 'tool_use', id: 'toolu_b1', name: 'navigate', input: { url: 'https://b.com' } }],
        },
      ])
      // A's Turn is still billed.
      const usage = await db.select().from(schema.usageRecords)
      expect(usage).toHaveLength(3)
      expect(await balance()).toBe(1000 - usage.reduce((sum, record) => sum + record.costCents, 0))
    }
  )

  it('keeps everything the older Run wrote after the newer Run started out of its prompt', async () => {
    const { runB } = await aTurn2EndsWhileBStreams()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('b.com is open.')], stopReason: 'end_turn' }))

    const response = await post({ runId: runB, previousTurns: [B_TURN_1_ECHO] })
    await response.text()

    expect(response.status).toBe(200)
    expect(sentParams(3).messages).toEqual([
      { role: 'user', content: 'Open a.com' },
      {
        role: 'assistant',
        content: 'Opening a.com.\n\nActions taken:\n- navigate {"url":"https://a.com"}',
      },
      { role: 'user', content: 'Open b.com' },
      { role: 'assistant', content: B_TURN_1 },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'toolu_b1', content: 'Navigated' }],
      },
    ])
  })
})
