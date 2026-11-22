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
  it('keeps a direct caller and a server tool caller of a type it has not seen, and drops a caller with neither shape', () => {
    const content = replay({
      content: [
        { type: 'tool_use', id: 'toolu_1', name: 'take_snapshot', input: {}, caller: { type: 'direct' } },
        { type: 'tool_use', id: 'toolu_2', name: 'take_snapshot', input: {}, caller: { type: 'future_caller' } },
        { type: 'tool_use', id: 'toolu_3', name: 'take_snapshot', input: {} },
        { type: 'tool_use', id: 'toolu_4', name: 'take_snapshot', input: {}, caller: { type: 'code_execution_20270101', tool_id: 'srvtoolu_9' } },
      ],
      toolResults: [],
    })

    expect(content).toEqual([
      expect.objectContaining({ id: 'toolu_1', caller: { type: 'direct' } }),
      expect.objectContaining({ id: 'toolu_2', caller: undefined }),
      expect.objectContaining({ id: 'toolu_3', caller: undefined }),
      expect.objectContaining({ id: 'toolu_4', caller: { type: 'code_execution_20270101', tool_id: 'srvtoolu_9' } }),
    ])
  })

  it('keeps a code execution caller with its tool id', () => {
    const content = replay({
      content: [
        {
          type: 'tool_use',
          id: 'toolu_1',
          name: 'take_snapshot',
          input: {},
          caller: { type: 'code_execution_20250825', tool_id: 'srvtoolu_1' },
        },
      ],
      toolResults: [],
    })

    expect(content).toEqual([
      expect.objectContaining({ caller: { type: 'code_execution_20250825', tool_id: 'srvtoolu_1' } }),
    ])
  })

  it('keeps a known web search error code and replaces an unknown one with unavailable', () => {
    const content = replay({
      content: [
        {
          type: 'web_search_tool_result',
          tool_use_id: 'srvtoolu_1',
          content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' },
        },
        {
          type: 'web_search_tool_result',
          tool_use_id: 'srvtoolu_2',
          content: { type: 'web_search_tool_result_error', error_code: 'brand_new_code' },
        },
      ],
      toolResults: [],
    })

    expect(content).toEqual([
      expect.objectContaining({ content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } }),
      expect.objectContaining({ content: { type: 'web_search_tool_result_error', error_code: 'unavailable' } }),
    ])
  })

  it('sends a citation without a title as a null title and leaves other citations as they are', () => {
    const cited = { type: 'web_search_result_location' as const, url: 'https://a.test', encrypted_index: 'e', cited_text: 'x' }
    const content = replay({
      content: [
        { type: 'text', text: 'answer', citations: [cited, { ...cited, title: 'A page' }] },
        { type: 'text', text: 'plain', citations: null },
      ],
      toolResults: [],
    })

    expect(content).toEqual([
      { type: 'text', text: 'answer', citations: [{ ...cited, title: null }, { ...cited, title: 'A page' }] },
      { type: 'text', text: 'plain', citations: null },
    ])
  })
})
