import { describe, it, expect, vi } from 'vitest'
import { MAX_AGENT_TURNS, type AgentStreamEvent } from '@prophet/shared'
import { runAgentLoop, type AgentRunEvent, type ToolRunner, type TurnSource } from './agent-loop'
import type { ToolExecutionResult } from './types'

const RUN_ID = '3f0c8a2e-6b1d-4c7a-9e5f-2a8b7c6d5e4f'

const SNAPSHOT_RESULT: ToolExecutionResult = { success: true, data: 'page snapshot', durationMs: 1 }

const toolUse = (id: string): AgentStreamEvent => ({
  type: 'tool_use',
  toolUse: { type: 'tool_use', id, name: 'take_snapshot', input: {} },
})

const done = (stopReason: string): AgentStreamEvent => ({ type: 'done', stopReason })

function fakeTurns(planTurn: (turnNumber: number) => AgentStreamEvent[]) {
  const bodies: Array<Record<string, unknown>> = []
  const openTurn: TurnSource = async function* ({ body }) {
    bodies.push(JSON.parse(body))
    yield* planTurn(bodies.length)
  }
  return { openTurn, bodies }
}

async function collect(options: Partial<Parameters<typeof runAgentLoop>[0]>): Promise<AgentRunEvent[]> {
  const events: AgentRunEvent[] = []
  for await (const event of runAgentLoop({ baseUrl: 'http://unused.test', chatId: 'chat-1', userMessage: 'Hi', ...options })) {
    events.push(event)
  }
  return events
}

const toolCallIds = (events: AgentRunEvent[], type: 'tool_call_start' | 'tool_call_complete' | 'tool_call_error') =>
  events.flatMap((event) => (event.type === type ? [event.toolCallId] : []))

describe('runAgentLoop with a fake Turn source and tool runner', () => {
  it('runs no further tool call of the Turn once Stop is pressed during the first one', async () => {
    const controller = new AbortController()
    const { openTurn, bodies } = fakeTurns(() => [toolUse('toolu_1'), toolUse('toolu_2'), done('tool_use')])
    const runTool = vi.fn<ToolRunner>(async () => {
      controller.abort()
      return SNAPSHOT_RESULT
    })

    const events = await collect({ openTurn, runTool, signal: controller.signal })

    expect(runTool).toHaveBeenCalledTimes(1)
    expect(runTool).toHaveBeenCalledWith({ name: 'take_snapshot', input: {} })
    expect(toolCallIds(events, 'tool_call_start')).toEqual(['toolu_1'])
    expect(bodies).toHaveLength(1)
    expect(events.at(-1)).toEqual({ type: 'error', error: 'Agent execution cancelled by user' })
  })

  it('sends a tool runner that throws back to Claude as an error result and goes on with the Run', async () => {
    const { openTurn, bodies } = fakeTurns((turn) =>
      turn === 1 ? [toolUse('toolu_1'), done('tool_use')] : [{ type: 'content_delta', delta: 'Sorry' }, done('end_turn')]
    )
    const runTool = vi.fn<ToolRunner>(async () => {
      throw new Error('Debugger detached')
    })

    const events = await collect({ openTurn, runTool })

    expect(events).toContainEqual({
      type: 'tool_call_error',
      toolName: 'take_snapshot',
      error: 'Debugger detached',
      toolCallId: 'toolu_1',
    })
    expect(bodies[1].previousTurns).toEqual([
      {
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'take_snapshot', input: {} }],
        toolResults: [
          {
            type: 'tool_result',
            tool_use_id: 'toolu_1',
            content: 'Tool execution failed: Debugger detached',
            is_error: true,
          },
        ],
      },
    ])
    expect(events.at(-1)).toEqual({ type: 'done', usage: undefined })
  })

  it('sends the runId from the first Turn’s session_created back on every continuation', async () => {
    const firstSession = { type: 'session_created' as const, sessionId: 'chat-1', runId: RUN_ID }
    const { openTurn, bodies } = fakeTurns((turn) => {
      if (turn === 1) return [firstSession, toolUse('toolu_1'), done('tool_use')]
      if (turn === 2) return [{ type: 'session_created', sessionId: 'chat-1' }, toolUse('toolu_2'), done('tool_use')]
      return [done('end_turn')]
    })
    const runTool = vi.fn<ToolRunner>(async () => SNAPSHOT_RESULT)

    await collect({ openTurn, runTool })

    expect(bodies).toHaveLength(3)
    expect(bodies[0]).toMatchObject({ chatId: 'chat-1', userMessage: 'Hi' })
    expect(bodies[0]).not.toHaveProperty('runId')
    expect(bodies[1].runId).toBe(RUN_ID)
    expect(bodies[2].runId).toBe(RUN_ID)
  })

  it('ends with the server’s run_notice after the last Turn’s reply', async () => {
    const lastTurnDone = { type: 'done' as const, stopReason: 'end_turn', runEnd: 'run_budget' }
    const { openTurn } = fakeTurns((turn) =>
      turn === 1
        ? [toolUse('toolu_1'), done('tool_use')]
        : [
            { type: 'content_delta', delta: 'Here is what I found' },
            { type: 'execution_complete', finalOutput: 'Here is what I found' },
            lastTurnDone,
          ]
    )
    const runTool = vi.fn<ToolRunner>(async () => SNAPSHOT_RESULT)

    const events = await collect({ openTurn, runTool })

    expect(events.slice(-3)).toEqual([
      {
        type: 'execution_complete',
        finalOutput: 'Here is what I found',
        metrics: { inputTokens: 0, outputTokens: 0 },
      },
      { type: 'done', usage: undefined },
      {
        type: 'run_notice',
        reason: 'run_budget',
        message: 'Prophet paused because this task grew too long for one run. Send "continue" to keep going.',
      },
    ])
  })

  it('runs no tool on the Turn limit’s last Turn and ends with the turn_limit run_notice', async () => {
    const { openTurn, bodies } = fakeTurns((turn) => [toolUse(`toolu_${turn}`), done('tool_use')])
    const runTool = vi.fn<ToolRunner>(async () => SNAPSHOT_RESULT)

    const events = await collect({ openTurn, runTool })

    expect(bodies).toHaveLength(MAX_AGENT_TURNS)
    expect(runTool).toHaveBeenCalledTimes(MAX_AGENT_TURNS - 1)
    expect(toolCallIds(events, 'tool_call_start')).not.toContain(`toolu_${MAX_AGENT_TURNS}`)
    expect(events.at(-1)).toEqual({
      type: 'run_notice',
      reason: 'turn_limit',
      message: 'Prophet paused after 20 turns. Send "continue" to keep going.',
    })
  })
})
