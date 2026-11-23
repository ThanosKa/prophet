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

  it('rejects an AGENT_EVENT whose event has no known type', () => {
    expect(isAgentEventMessage({ type: 'AGENT_EVENT', event: {} })).toBe(false)
    expect(isAgentEventMessage({ type: 'AGENT_EVENT', event: { type: 'toString' } })).toBe(false)
    expect(isAgentEventMessage({ type: 'AGENT_EVENT', event: { type: 'future_event' } })).toBe(false)
  })

  it('checks each field of an AGENT_STATE', () => {
    const running = {
      ...DEFAULT_AGENT_STATE,
      isRunning: true,
      chatId: '8f14e45f-ceea-467f-a0e6-1b2c3d4e5f60',
      model: 'claude-sonnet-5-5',
      currentToolExecution: { toolName: 'navigate', toolInput: { url: 'https://example.com' }, startedAt: 1763856000000 },
      pendingEvents: [{ type: 'content_delta', delta: 'Opening' }],
    }
    expect(isAgentStateResponse({ type: 'AGENT_STATE', state: running })).toBe(true)
    expect(isAgentStateResponse({ type: 'AGENT_STATE', state: { ...running, isRunning: 'yes' } })).toBe(false)
    expect(isAgentStateResponse({ type: 'AGENT_STATE', state: { ...running, pendingEvents: [{}] } })).toBe(false)
    expect(isAgentStateResponse({ type: 'AGENT_STATE', state: { ...running, currentToolExecution: {} } })).toBe(false)
    expect(isAgentStateResponse({ type: 'AGENT_STATE', state: {} })).toBe(false)
  })
})
