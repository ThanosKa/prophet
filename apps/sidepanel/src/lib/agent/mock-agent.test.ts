import { describe, it, expect } from 'vitest'
import { MAX_AGENT_TURNS } from '@prophet/shared'
import { runAgentLoop, type AgentRunEvent } from './agent-loop'
import { createMockAdapters } from './mock-agent'

// Runs mock mode's scenarios through the real Run loop: no module mocks, no fetch, no chrome.

async function runMock(userMessage: string, options: { enableThinking?: boolean } = {}): Promise<AgentRunEvent[]> {
  const { openTurn, runTool } = createMockAdapters({ userMessage, wait: async () => {} })
  const events: AgentRunEvent[] = []
  for await (const event of runAgentLoop({
    baseUrl: 'http://unused.test',
    chatId: 'chat-1',
    userMessage,
    openTurn,
    runTool,
    ...options,
  })) {
    events.push(event)
  }
  return events
}

const startedTools = (events: AgentRunEvent[]) =>
  events.flatMap((event) => (event.type === 'tool_call_start' ? [event.toolName] : []))

describe('mock mode under the Run loop', () => {
  it('continues past the tool Turn, answers on the next one and ends cleanly', async () => {
    const events = await runMock('/snap')

    expect(startedTools(events)).toEqual(['take_snapshot', 'search_snapshot'])
    expect(events.filter((event) => event.type === 'tool_call_complete')).toHaveLength(2)
    expect(events.filter((event) => event.type === 'tool_call_error')).toEqual([])
    expect(events.filter((event) => event.type === 'execution_complete')).toHaveLength(1)
    expect(events.at(-1)).toMatchObject({ type: 'done' })
    expect(events.some((event) => event.type === 'error')).toBe(false)
  })

  it('ends with the turn_limit run_notice when a scenario never stops asking for tools', async () => {
    const events = await runMock('/limit')

    expect(startedTools(events)).toHaveLength(MAX_AGENT_TURNS - 1)
    expect(events.at(-1)).toMatchObject({ type: 'run_notice', reason: 'turn_limit' })
  })

  it('ends with the run_budget run_notice after the last Turn’s reply', async () => {
    const events = await runMock('/budget')

    expect(events.at(-1)).toMatchObject({ type: 'run_notice', reason: 'run_budget' })
    expect(events.at(-2)).toMatchObject({ type: 'done' })
  })

  it.each(['/all', '/snap', '/nav', '/tabs', '/element', '/wait', '/page', '/think'])(
    'runs %s through the loop with every tool call passing its input check',
    async (command) => {
      const events = await runMock(command)

      expect(startedTools(events).length).toBeGreaterThan(0)
      expect(events.filter((event) => event.type === 'tool_call_error')).toEqual([])
      expect(events.at(-1)).toMatchObject({ type: 'done' })
    }
  )

  it('streams thinking for /think and when the brain toggle is on, not otherwise', async () => {
    const thinking = (events: AgentRunEvent[]) => events.some((event) => event.type === 'thinking_delta')

    expect(thinking(await runMock('/think'))).toBe(true)
    expect(thinking(await runMock('/snap', { enableThinking: true }))).toBe(true)
    expect(thinking(await runMock('/snap'))).toBe(false)
  })
})
