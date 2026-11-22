import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AGENT_STATE,
  isAgentEventMessage,
  isAgentStateResponse,
  isExecuteToolRequest,
  isGetAgentStateRequest,
  isStartAgentLoopRequest,
  isStopAgentLoopRequest,
} from './messages'

describe('background message guards', () => {
  it('accepts a full EXECUTE_TOOL request', () => {
    expect(
      isExecuteToolRequest({
        type: 'EXECUTE_TOOL',
        toolName: 'click_element',
        toolInput: { ref: 'e1' },
        requestId: 'req-1',
      })
    ).toBe(true)
  })

  it('rejects an EXECUTE_TOOL request missing its fields', () => {
    expect(isExecuteToolRequest({ type: 'EXECUTE_TOOL' })).toBe(false)
    expect(
      isExecuteToolRequest({ type: 'EXECUTE_TOOL', toolName: 'x', toolInput: null, requestId: 'r' })
    ).toBe(false)
    expect(
      isExecuteToolRequest({ type: 'EXECUTE_TOOL', toolName: 'x', toolInput: {}, requestId: 3 })
    ).toBe(false)
  })

  it('rejects non-objects and other message types', () => {
    expect(isExecuteToolRequest(null)).toBe(false)
    expect(isExecuteToolRequest('EXECUTE_TOOL')).toBe(false)
    expect(isGetAgentStateRequest({ type: 'STOP_AGENT_LOOP' })).toBe(false)
  })

  it('accepts the field-less requests by type alone', () => {
    expect(isGetAgentStateRequest({ type: 'GET_AGENT_STATE' })).toBe(true)
    expect(isStopAgentLoopRequest({ type: 'STOP_AGENT_LOOP' })).toBe(true)
  })

  it('checks START_AGENT_LOOP fields', () => {
    expect(
      isStartAgentLoopRequest({ type: 'START_AGENT_LOOP', chatId: 'c', userMessage: 'hi', model: 'm' })
    ).toBe(true)
    expect(isStartAgentLoopRequest({ type: 'START_AGENT_LOOP', chatId: 'c' })).toBe(false)
  })

  it('checks AGENT_EVENT and AGENT_STATE payloads', () => {
    expect(isAgentEventMessage({ type: 'AGENT_EVENT', event: { type: 'done' } })).toBe(true)
    expect(isAgentEventMessage({ type: 'AGENT_EVENT' })).toBe(false)
    expect(isAgentStateResponse({ type: 'AGENT_STATE', state: DEFAULT_AGENT_STATE })).toBe(true)
    expect(isAgentStateResponse({ type: 'AGENT_STATE', state: null })).toBe(false)
  })
})
