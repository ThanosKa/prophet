import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  anthropicTurn,
  createTables,
  frames,
  loggerMock,
  postAgentChat,
  resetAs,
  seedUserWithChat,
  streamMock,
  text,
  toolUse,
} from './route-test-harness'

const USER_ID = 'user_request_kind_log'
const CHAT_ID = '3c9d7e1a-6b2f-4a8e-b5d4-0e1f2a3b4c5d'

beforeAll(createTables)

beforeEach(async () => {
  await resetAs(USER_ID)
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits: 1000 })
  loggerMock.debug.mockClear()
})

function post(body: Record<string, unknown>) {
  return postAgentChat({ chatId: CHAT_ID, model: 'claude-haiku-5-5', ...body })
}

const TURN_1 = [text('Opening a.com.'), toolUse({ id: 'toolu_1', name: 'navigate', input: { url: 'https://a.com' } })]
const TURN_1_ECHO = {
  content: TURN_1,
  toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'Navigated' }],
}

/** The `kind` field of the "Starting agent stream" log, one entry per Turn. */
function loggedKinds() {
  return loggerMock.debug.mock.calls
    .filter(([, message]) => message === 'Starting agent stream')
    .map(([fields]) => (fields as { kind?: string }).kind)
}

async function firstTurn() {
  streamMock.mockReturnValueOnce(anthropicTurn({ content: TURN_1, stopReason: 'tool_use' }))
  const response = await post({ userMessage: 'Open a.com' })
  const opened = frames(await response.text()).find((event) => event.type === 'session_created')
  return opened?.runId as string
}

describe('the request kind in the "Starting agent stream" log', () => {
  it('logs first for a first Turn', async () => {
    await firstTurn()

    expect(loggedKinds()).toEqual(['first'])
  })

  it('logs run for a 1.0.7+ Run continuation', async () => {
    const runId = await firstTurn()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Done.')], stopReason: 'end_turn' }))

    await (await post({ runId, previousTurns: [TURN_1_ECHO] })).text()

    expect(loggedKinds()).toEqual(['first', 'run'])
  })

  it('logs continuation for a 1.0.5-1.0.6 continuation without a runId', async () => {
    await firstTurn()
    streamMock.mockReturnValueOnce(anthropicTurn({ content: [text('Done.')], stopReason: 'end_turn' }))

    await (await post({ previousTurns: [TURN_1_ECHO] })).text()

    expect(loggedKinds()).toEqual(['first', 'continuation'])
  })
})
