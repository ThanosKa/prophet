import { describe, it, expect } from 'vitest'
import { agentChatRequestSchema, type AgentChatRequest, type AgentTurn } from '@prophet/shared'
import { cachedPrefixTurns, readRequestKind, toRunRequest, type RequestKind } from './request-kind'

const CHAT_ID = '11111111-1111-4111-8111-111111111111'
const RUN_ID = '22222222-2222-4222-8222-222222222222'
const OPENING = { id: RUN_ID, createdAt: new Date('2026-11-14T10:00:00Z') }

function turn(n: number): AgentTurn {
  return {
    content: [{ type: 'tool_use', id: `toolu_${n}`, name: 'get_page_content', input: {} }],
    toolResults: [{ type: 'tool_result', tool_use_id: `toolu_${n}`, content: `result ${n}` }],
  }
}

// Bodies go through the real schema, as the route's do.
function body(fields: Record<string, unknown>): AgentChatRequest {
  return agentChatRequestSchema.parse({ chatId: CHAT_ID, ...fields })
}

const t1 = turn(1)
const t2 = turn(2)
const t3 = turn(3)

type Row = {
  name: string
  body: AgentChatRequest
  kind: string
  runTurns?: AgentTurn[]
  runId?: string
  cachedPrefix: AgentTurn[] | null
  from: { opened: typeof OPENING } | { resumed: typeof OPENING } | null
  runRequest: unknown
}

const rows: Row[] = [
  {
    name: 'any build: first Turn',
    body: body({ userMessage: 'hi' }),
    kind: 'first',
    runTurns: [],
    cachedPrefix: null,
    from: { opened: OPENING },
    runRequest: { type: 'first', opening: OPENING },
  },
  {
    name: 'before 1.0.5: previousContent with toolResults',
    body: body({ previousContent: t1.content, toolResults: t1.toolResults }),
    kind: 'legacy',
    runTurns: [t1],
    cachedPrefix: null,
    from: null,
    runRequest: { type: 'legacy', turns: [t1] },
  },
  {
    name: '1.0.5-1.0.6: previousTurns, no runId',
    body: body({ previousTurns: [t1, t2, t3] }),
    kind: 'continuation',
    runTurns: [t1, t2, t3],
    cachedPrefix: [t1, t2],
    from: null,
    runRequest: { type: 'continuation', turns: [t1, t2, t3] },
  },
  {
    name: '1.0.5-1.0.6: a single previous Turn caches an empty prefix, not none',
    body: body({ previousTurns: [t1] }),
    kind: 'continuation',
    runTurns: [t1],
    cachedPrefix: [],
    from: null,
    runRequest: { type: 'continuation', turns: [t1] },
  },
  {
    name: '1.0.7+: previousTurns with runId',
    body: body({ runId: RUN_ID, previousTurns: [t1, t2] }),
    kind: 'run',
    runTurns: [t1, t2],
    runId: RUN_ID,
    cachedPrefix: [t1],
    from: { resumed: OPENING },
    runRequest: { type: 'run', opening: OPENING, turns: [t1, t2] },
  },
  {
    name: 'edge: userMessage with previousTurns is a first Turn; its previousTurns are kept as runTurns (they count for the last-Turn decision, not the prompt)',
    body: body({ userMessage: 'hi', previousTurns: [t1, t2] }),
    kind: 'first',
    runTurns: [t1, t2],
    cachedPrefix: null,
    from: { opened: OPENING },
    runRequest: { type: 'first', opening: OPENING },
  },
  {
    name: 'edge: runId with the legacy body is a Run continuation with no cached prefix',
    body: body({ runId: RUN_ID, previousContent: t1.content, toolResults: t1.toolResults }),
    kind: 'run',
    runTurns: [t1],
    runId: RUN_ID,
    cachedPrefix: null,
    from: { resumed: OPENING },
    runRequest: { type: 'run', opening: OPENING, turns: [t1] },
  },
  {
    name: 'edge: runId on a first Turn is kept',
    body: body({ userMessage: 'hi', runId: RUN_ID }),
    kind: 'first',
    runTurns: [],
    runId: RUN_ID,
    cachedPrefix: null,
    from: { opened: OPENING },
    runRequest: { type: 'first', opening: OPENING },
  },
]

describe('request kind', () => {
  it.each(rows)('$name', (row) => {
    const read = readRequestKind(row.body)
    expect(read.kind).toBe(row.kind)
    if (read.kind === 'invalid') throw new Error('expected a valid kind')

    expect(read.runTurns).toEqual(row.runTurns)
    const runId = read.kind === 'first' || read.kind === 'run' ? read.runId : undefined
    expect(runId).toBe(row.runId)
    expect(cachedPrefixTurns(read)).toEqual(row.cachedPrefix)
    expect(toRunRequest({ kind: read, from: row.from })).toEqual(row.runRequest)
  })

  it('marks a run that sends its whole Run', () => {
    const whole = readRequestKind(body({ runId: RUN_ID, previousTurns: [t1] }))
    const legacy = readRequestKind(
      body({ runId: RUN_ID, previousContent: t1.content, toolResults: t1.toolResults })
    )
    expect(whole).toMatchObject({ kind: 'run', sendsWholeRun: true })
    expect(legacy).toMatchObject({ kind: 'run', sendsWholeRun: false })
  })

  describe('invalid, where the route answers 400', () => {
    it.each([
      ['an empty body', {}],
      ['only a runId', { runId: RUN_ID }],
      ['toolResults without previousContent', { toolResults: t1.toolResults }],
      ['an empty previousContent', { previousContent: [], toolResults: [] }],
    ])('%s', (_name, fields) => {
      expect(readRequestKind(body(fields))).toEqual({ kind: 'invalid' })
    })
  })

  it('refuses a RunRequest without the opening the kind needs', () => {
    const first: RequestKind = { kind: 'first', userMessage: 'hi', runTurns: [] }
    const run: RequestKind = { kind: 'run', runId: RUN_ID, runTurns: [t1], sendsWholeRun: true }
    expect(() => toRunRequest({ kind: first, from: null })).toThrow()
    expect(() => toRunRequest({ kind: run, from: { opened: OPENING } })).toThrow()
  })
})
