import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { asc, eq } from 'drizzle-orm'
import { HISTORY_BUDGET_TOKENS, RUN_BUDGET_TOKENS } from '@prophet/shared'
import * as schema from '@/lib/db/schema'
import { estimateInputTokens } from '@/lib/credit-reservation'
import { AGENT_SYSTEM_PROMPT } from '@/lib/agent/system-prompt'
import {
  anthropicTurn,
  createTables,
  db,
  frames,
  postAgentChat,
  resetAs,
  seedUserWithChat,
  sentParams,
  streamMock,
  text,
  type ApiBlock,
  type Frame,
} from './route-test-harness'

const USER_ID = 'user_last_turn'
const CHAT_ID = '3e9b1c7a-5d2f-4a8e-b6c4-1f0e2d3c4b5a'
const OPENING_ID = '8c4f2a1e-7b3d-4e5f-9a6b-0d1c2e3f4a5b'

beforeAll(createTables)

beforeEach(async () => {
  await resetAs(USER_ID)
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: 100_000 })
})

function post(body: Record<string, unknown>) {
  return postAgentChat({ chatId: CHAT_ID, model: 'claude-haiku-5-5', ...body })
}

const snapshotCall = (id: string): ApiBlock => ({ type: 'tool_use', id, name: 'take_snapshot', input: {} })

/** Claude takes another snapshot, the reply a last Turn must not act on. */
function claudeCallsATool() {
  streamMock.mockReturnValue(
    anthropicTurn({ content: [text('Taking another snapshot.'), snapshotCall('toolu_next')], stopReason: 'tool_use' })
  )
}

/** One finished Turn of the Run as the extension echoes it, with its snapshot result. */
function earlierTurn({ index, snapshot = 'Snapshot of the page' }: { index: number; snapshot?: string }) {
  const id = `toolu_${index}`
  return {
    content: [text(`Step ${index}.`), snapshotCall(id)],
    toolResults: [{ type: 'tool_result', tool_use_id: id, content: snapshot }],
  }
}

function earlierTurns(count: number) {
  return Array.from({ length: count }, (_, index) => earlierTurn({ index: index + 1 }))
}

/** The Run's opening user row, as Turn 1 saved it. */
async function seedOpening() {
  await db.insert(schema.messages).values({
    id: OPENING_ID,
    chatId: CHAT_ID,
    role: 'user',
    content: 'Tidy my inbox',
    createdAt: new Date(Date.UTC(2026, 0, 2)),
  })
}

/** Snapshot-like page text, `chars` characters long. */
function realisticSnapshot(chars: number) {
  const lines = Array.from(
    { length: 1000 },
    (_, i) => `[uid=1_${i}] link "Re: quarterly report thread ${i}" href="/mail/${i}"`
  )
  return lines.join('\n').slice(0, chars)
}

/**
 * Earlier chat, far larger than the history window: 30 rows of 3,990 characters, so
 * each one is 1,995 estimated tokens and exactly the newest 10 fit in 20,000.
 */
const LONG_HISTORY = Array.from({ length: 30 }, (_, i) => ({
  role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
  content: `${i}`.padStart(2, '0') + 'x'.repeat(3988),
}))

async function seedLongHistory() {
  await db.insert(schema.messages).values(
    LONG_HISTORY.map((row, i) => ({
      chatId: CHAT_ID,
      ...row,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
    }))
  )
}

async function openingRowId() {
  const rows = await db.query.messages.findMany({
    where: eq(schema.messages.chatId, CHAT_ID),
    orderBy: [asc(schema.messages.createdAt)],
  })
  const opening = rows.filter((row) => row.role === 'user').at(-1)
  if (!opening) throw new Error('no opening row')
  return opening.id
}

async function continueRun(body: Record<string, unknown>) {
  const response = await post(body)
  expect(response.status).toBe(200)
  return frames(await response.text())
}

function doneOf(events: Frame[]) {
  const done = events.find((event) => event.type === 'done')
  if (!done) throw new Error('no done event')
  return done
}

const releasedToolUses = (events: Frame[]) => events.filter((event) => event.type === 'tool_use')
const systemMessages = (call = 0): unknown[] =>
  sentParams(call).messages.filter((message: { role: string }) => message.role === 'system')

/**
 * The Hold's estimate of a prompt the route sent. The Run budget is defined on this
 * estimator, so the boundary tests size their prompts with it.
 */
function estimateOfSentPrompt(call: number) {
  const { tools, messages } = sentParams(call)
  return estimateInputTokens({ system: AGENT_SYSTEM_PROMPT, tools, messages })
}

describe('the Run budget in POST /api/agent/chat', () => {
  /** A continuation whose one snapshot result is `chars` ASCII characters long. */
  const withSnapshot = (chars: number) => ({
    runId: OPENING_ID,
    previousTurns: [earlierTurn({ index: 1, snapshot: 'x'.repeat(chars) })],
  })

  /** Snapshot length that puts the prompt's estimate exactly at `RUN_BUDGET_TOKENS`. */
  async function charsForBudget() {
    const probeChars = 1000
    await continueRun(withSnapshot(probeChars))
    // Every two more ASCII characters add one estimated token.
    return probeChars + 2 * (RUN_BUDGET_TOKENS - estimateOfSentPrompt(0))
  }

  it('makes a continuation estimated at the Run budget its last Turn', async () => {
    await seedOpening()
    claudeCallsATool()
    const chars = await charsForBudget()

    const events = await continueRun(withSnapshot(chars))

    expect(systemMessages(1)).toHaveLength(1)
    expect(releasedToolUses(events)).toEqual([])
    expect(doneOf(events).runEnd).toBe('run_budget')
  })

  it('lets a continuation estimated just under the Run budget go on', async () => {
    await seedOpening()
    claudeCallsATool()
    const chars = await charsForBudget()

    const events = await continueRun(withSnapshot(chars - 2))

    expect(estimateOfSentPrompt(1)).toBe(RUN_BUDGET_TOKENS - 1)
    expect(systemMessages(1)).toEqual([])
    expect(releasedToolUses(events)).toHaveLength(1)
    expect(doneOf(events)).not.toHaveProperty('runEnd')
  })

  it('gives a Run of 20,000-character snapshots at least 5 tool Turns before the budget ends it', async () => {
    await seedLongHistory()
    claudeCallsATool()

    const first = await continueRun({ userMessage: 'Archive every old thread' })
    let toolTurns = releasedToolUses(first).length
    const runId = await openingRowId()
    const turns = [earlierTurn({ index: 1, snapshot: realisticSnapshot(20_000) })]
    for (;;) {
      const events = await continueRun({ runId, previousTurns: turns })
      if (doneOf(events).runEnd) {
        expect(doneOf(events).runEnd).toBe('run_budget')
        break
      }
      toolTurns += releasedToolUses(events).length
      turns.push(earlierTurn({ index: turns.length + 1, snapshot: realisticSnapshot(20_000) }))
    }

    expect(toolTurns).toBeGreaterThanOrEqual(5)
  })
})

describe('the last Turn of a Run in POST /api/agent/chat', () => {
  it('tells Claude to wrap up and releases no tool call on the Turn after 19 earlier Turns', async () => {
    await seedOpening()
    claudeCallsATool()

    const events = await continueRun({ runId: OPENING_ID, previousTurns: earlierTurns(19) })

    const messages = sentParams().messages
    expect(messages.at(-2).role).toBe('user')
    expect(messages.at(-1)).toEqual({ role: 'system', content: expect.stringContaining('continue') })
    expect(messages.at(-1).content).toMatch(/last Turn/i)
    expect(messages.at(-1).content).toMatch(/not call (any )?tools/i)
    expect(sentParams()).not.toHaveProperty('tool_choice')
    expect(releasedToolUses(events)).toEqual([])
    expect(doneOf(events).runEnd).toBe('turn_limit')
  })

  it('carries on as usual after 18 earlier Turns', async () => {
    await seedOpening()
    claudeCallsATool()

    const events = await continueRun({ runId: OPENING_ID, previousTurns: earlierTurns(18) })

    expect(systemMessages()).toEqual([])
    expect(releasedToolUses(events)).toHaveLength(1)
    expect(doneOf(events)).not.toHaveProperty('runEnd')
  })

  it('sends the same tools on a last Turn as on any other', async () => {
    await seedOpening()
    claudeCallsATool()

    await continueRun({ runId: OPENING_ID, previousTurns: earlierTurns(18) })
    await continueRun({ runId: OPENING_ID, previousTurns: earlierTurns(19) })

    expect(JSON.stringify(sentParams(1).tools)).toBe(JSON.stringify(sentParams(0).tools))
    expect(sentParams(1)).not.toHaveProperty('tool_choice')
  })

  it('ends a Run from a build without runId (1.0.5) after 9 earlier Turns', async () => {
    await seedOpening()
    claudeCallsATool()

    const events = await continueRun({ previousTurns: earlierTurns(9) })

    expect(systemMessages()).toHaveLength(1)
    expect(releasedToolUses(events)).toEqual([])
    expect(doneOf(events).runEnd).toBe('turn_limit')
  })

  it('lets a Run that sends its runId go on after 9 earlier Turns', async () => {
    await seedOpening()
    claudeCallsATool()

    const events = await continueRun({ runId: OPENING_ID, previousTurns: earlierTurns(9) })

    expect(systemMessages()).toEqual([])
    expect(releasedToolUses(events)).toHaveLength(1)
    expect(doneOf(events)).not.toHaveProperty('runEnd')
  })

  it('never puts the notice after a paused Turn, which has no tool results to follow', async () => {
    await seedOpening()
    const paused = { content: [text('Still searching.')], toolResults: [] }
    streamMock.mockReturnValue(anthropicTurn({ content: [text('Found it.')], stopReason: 'end_turn' }))

    const events = await continueRun({ runId: OPENING_ID, previousTurns: [...earlierTurns(18), paused] })

    expect(systemMessages()).toEqual([])
    expect(sentParams().messages.at(-1)).toEqual({ role: 'assistant', content: paused.content })
    expect(doneOf(events)).not.toHaveProperty('runEnd')
  })

  it("saves the last Turn's text as the Run's reply, without the tool call Claude made anyway", async () => {
    await seedOpening()
    streamMock.mockReturnValue(
      anthropicTurn({
        content: [text('I archived 19 threads; 4 are left.'), snapshotCall('toolu_ignored')],
        stopReason: 'tool_use',
      })
    )

    await continueRun({ runId: OPENING_ID, previousTurns: earlierTurns(19) })

    const rows = await db.query.messages.findMany({
      where: eq(schema.messages.chatId, CHAT_ID),
      orderBy: [asc(schema.messages.createdAt)],
    })
    const reply = rows.at(-1)
    expect(reply?.role).toBe('assistant')
    expect(reply?.content.endsWith('\nI archived 19 threads; 4 are left.')).toBe(true)
    const storedIds = JSON.parse(reply?.toolCalls ?? '[]').map((call: { id: string }) => call.id)
    expect(storedIds).toEqual(earlierTurns(19).map((turn) => turn.toolResults[0]?.tool_use_id))
  })
})

describe('the history window of a new Run in POST /api/agent/chat', () => {
  const asSent = (rows: typeof LONG_HISTORY) => rows.map(({ role, content }) => ({ role, content }))

  it('sends only the newest earlier rows that fit, then the opening message', async () => {
    await seedLongHistory()
    claudeCallsATool()

    await continueRun({ userMessage: 'Archive every old thread' })

    expect(sentParams().messages).toEqual([
      ...asSent(LONG_HISTORY.slice(20)),
      { role: 'user', content: 'Archive every old thread' },
    ])
  })

  it('sends Turn 1 and Turn 2 byte-identical messages up to the opening message', async () => {
    await seedLongHistory()
    claudeCallsATool()

    await continueRun({ userMessage: 'Archive every old thread' })
    const runId = await openingRowId()
    await continueRun({ runId, previousTurns: [earlierTurn({ index: 1 })] })

    const turn1 = sentParams(0).messages
    const turn2 = sentParams(1).messages
    expect(JSON.stringify(turn2.slice(0, turn1.length))).toBe(JSON.stringify(turn1))
    expect(turn2[turn1.length - 1]).toEqual({ role: 'user', content: 'Archive every old thread' })
  })

  it('does the same for a build without runId, whose opening is the newest user row', async () => {
    await seedLongHistory()
    claudeCallsATool()

    await continueRun({ userMessage: 'Archive every old thread' })
    await continueRun({ previousTurns: [earlierTurn({ index: 1 })] })

    const turn1 = JSON.stringify(sentParams(0).messages)
    expect(JSON.stringify(sentParams(1).messages).startsWith(turn1.slice(0, -1))).toBe(true)
  })

  it('always keeps the newest earlier row, even when it alone is over the budget', async () => {
    await seedLongHistory()
    const huge = 'y'.repeat(2 * HISTORY_BUDGET_TOKENS + 2000)
    await db.insert(schema.messages).values({
      chatId: CHAT_ID,
      role: 'user',
      content: huge,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 1)),
    })
    claudeCallsATool()

    await continueRun({ userMessage: 'Try again' })

    expect(sentParams().messages).toEqual([
      { role: 'user', content: huge },
      { role: 'user', content: 'Try again' },
    ])
  })
})
