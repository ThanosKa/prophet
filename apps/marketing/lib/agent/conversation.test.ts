import { describe, it, expect } from 'vitest'
import type { AgentTurn } from '@prophet/shared'
import { buildAgentMessages } from './conversation'

function replay(turn: AgentTurn) {
  const messages = buildAgentMessages({
    history: [],
    userMessage: undefined,
    image: undefined,
    runTurns: [turn],
  })
  return messages.find((message) => message.role === 'assistant')?.content
}

describe('buildAgentMessages replay of an assistant turn', () => {
  it('echoes every tool call caller as sent, including a caller type it has not seen', () => {
    const content: AgentTurn['content'] = [
      { type: 'tool_use', id: 'toolu_01A', name: 'take_snapshot', input: {}, caller: { type: 'direct' } },
      { type: 'tool_use', id: 'toolu_01B', name: 'take_snapshot', input: {}, caller: { type: 'future_caller' } },
      { type: 'tool_use', id: 'toolu_01C', name: 'take_snapshot', input: {} },
      {
        type: 'tool_use',
        id: 'toolu_01D',
        name: 'take_snapshot',
        input: {},
        caller: { type: 'code_execution_20250825', tool_id: 'srvtoolu_01E' },
      },
    ]

    const echoed = replay({ content, toolResults: [] })

    expect(echoed).toEqual(content)
    expect(JSON.stringify(echoed)).toBe(JSON.stringify(content))
  })

  it('echoes a web search error code as sent, including one it does not know', () => {
    const content: AgentTurn['content'] = [
      {
        type: 'web_search_tool_result',
        tool_use_id: 'srvtoolu_01A',
        content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' },
      },
      {
        type: 'web_search_tool_result',
        tool_use_id: 'srvtoolu_01B',
        content: { type: 'web_search_tool_result_error', error_code: 'brand_new_code' },
      },
    ]

    const echoed = replay({ content, toolResults: [] })

    expect(JSON.stringify(echoed)).toBe(JSON.stringify(content))
  })

  it('echoes text, citations without a title, signed thinking and search results as sent', () => {
    const cited = {
      type: 'web_search_result_location' as const,
      url: 'https://a.test/',
      encrypted_index: 'Eo8BCioIAhgBIiQ',
      cited_text: 'x',
    }
    const content: AgentTurn['content'] = [
      { type: 'thinking', thinking: 'Search first.', signature: 'EqQBCkYIARgCIkA' },
      { type: 'redacted_thinking', data: 'EmwKAhgBEgy' },
      { type: 'server_tool_use', id: 'srvtoolu_01A', name: 'web_search', input: { query: 'a' } },
      {
        type: 'web_search_tool_result',
        tool_use_id: 'srvtoolu_01A',
        content: [{ type: 'web_search_result', url: 'https://a.test/', title: 'A', encrypted_content: 'EqgfCioIARgB', page_age: null }],
      },
      { type: 'text', text: 'answer', citations: [cited, { ...cited, title: 'A page' }] },
      { type: 'text', text: 'plain', citations: null },
    ]

    const echoed = replay({ content, toolResults: [] })

    expect(JSON.stringify(echoed)).toBe(JSON.stringify(content))
  })
})
