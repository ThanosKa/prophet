import type { ToolExecutionResult, AgentLoopEvent } from './types'

// ============================================================================
// Sidepanel → Background Messages
// ============================================================================

export interface ExecuteToolRequest {
  type: 'EXECUTE_TOOL'
  toolName: string
  toolInput: Record<string, unknown>
  requestId: string
}

export interface StartAgentLoopRequest {
  type: 'START_AGENT_LOOP'
  chatId: string
  userMessage: string
  model: string
  image?: {
    base64: string
    mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  }
}

export interface GetAgentStateRequest {
  type: 'GET_AGENT_STATE'
}

export interface StopAgentLoopRequest {
  type: 'STOP_AGENT_LOOP'
}

export interface SubscribeAgentEventsRequest {
  type: 'SUBSCRIBE_AGENT_EVENTS'
}

export type SidepanelToBackgroundMessage =
  | ExecuteToolRequest
  | StartAgentLoopRequest
  | GetAgentStateRequest
  | StopAgentLoopRequest
  | SubscribeAgentEventsRequest

// ============================================================================
// Background → Sidepanel Messages
// ============================================================================

export interface ToolExecutionResponse {
  type: 'TOOL_RESULT'
  requestId: string
  success: boolean
  result?: ToolExecutionResult
  error?: string
}

export interface AgentEventMessage {
  type: 'AGENT_EVENT'
  event: AgentLoopEvent
}

export interface AgentStateResponse {
  type: 'AGENT_STATE'
  state: AgentState
}

export type BackgroundToSidepanelMessage =
  | ToolExecutionResponse
  | AgentEventMessage
  | AgentStateResponse

// ============================================================================
// Background → Content Script Messages
// ============================================================================

export interface HighlightElementRequest {
  type: 'HIGHLIGHT_ELEMENT'
  uid: string
  color?: string
}

export interface ClearHighlightsRequest {
  type: 'CLEAR_HIGHLIGHTS'
}

export interface ShowClickIndicatorRequest {
  type: 'SHOW_CLICK_INDICATOR'
  x: number
  y: number
  uid?: string
}

export interface ShowHoverIndicatorRequest {
  type: 'SHOW_HOVER_INDICATOR'
  uid: string
}

export interface ShowFillIndicatorRequest {
  type: 'SHOW_FILL_INDICATOR'
  uid: string
  value: string
}

export type BackgroundToContentMessage =
  | HighlightElementRequest
  | ClearHighlightsRequest
  | ShowClickIndicatorRequest
  | ShowHoverIndicatorRequest
  | ShowFillIndicatorRequest

// ============================================================================
// Agent State (stored in chrome.storage.local)
// ============================================================================

export interface AgentState {
  isRunning: boolean
  chatId: string | null
  model: string | null
  currentToolExecution: {
    toolName: string
    toolInput: unknown
    startedAt: number
  } | null
  pendingEvents: AgentLoopEvent[]
  accumulatedContent: string
  error: string | null
}

export const DEFAULT_AGENT_STATE: AgentState = {
  isRunning: false,
  chatId: null,
  model: null,
  currentToolExecution: null,
  pendingEvents: [],
  accumulatedContent: '',
  error: null,
}

// ============================================================================
// Type Guards
// ============================================================================

export function isExecuteToolRequest(msg: unknown): msg is ExecuteToolRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as ExecuteToolRequest).type === 'EXECUTE_TOOL'
  )
}

export function isStartAgentLoopRequest(msg: unknown): msg is StartAgentLoopRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as StartAgentLoopRequest).type === 'START_AGENT_LOOP'
  )
}

export function isGetAgentStateRequest(msg: unknown): msg is GetAgentStateRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as GetAgentStateRequest).type === 'GET_AGENT_STATE'
  )
}

export function isStopAgentLoopRequest(msg: unknown): msg is StopAgentLoopRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as StopAgentLoopRequest).type === 'STOP_AGENT_LOOP'
  )
}
