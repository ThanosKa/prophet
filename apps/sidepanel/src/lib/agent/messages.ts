import type { ToolExecutionResult, AgentLoopEvent } from './types'

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

export interface CloseAuthTabRequest {
  type: 'CLOSE_AUTH_TAB'
}

export interface OpenSidePanelRequest {
  type: 'OPEN_SIDE_PANEL'
}

export type SidepanelToBackgroundMessage =
  | ExecuteToolRequest
  | StartAgentLoopRequest
  | GetAgentStateRequest
  | StopAgentLoopRequest
  | SubscribeAgentEventsRequest
  | CloseAuthTabRequest
  | OpenSidePanelRequest

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

export interface AgentActiveRequest {
  type: 'AGENT_ACTIVE'
}

export interface AgentInactiveRequest {
  type: 'AGENT_INACTIVE'
}

export type BackgroundToContentMessage =
  | AgentActiveRequest
  | AgentInactiveRequest

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

function messageOfType(type: string) {
  return (msg: unknown): msg is { type: string } =>
    typeof msg === 'object' && msg !== null && 'type' in msg && msg.type === type
}

export function isExecuteToolRequest(msg: unknown): msg is ExecuteToolRequest {
  return (
    messageOfType('EXECUTE_TOOL')(msg) &&
    'toolName' in msg &&
    typeof msg.toolName === 'string' &&
    'toolInput' in msg &&
    typeof msg.toolInput === 'object' &&
    msg.toolInput !== null &&
    'requestId' in msg &&
    typeof msg.requestId === 'string'
  )
}

export function isStartAgentLoopRequest(msg: unknown): msg is StartAgentLoopRequest {
  return (
    messageOfType('START_AGENT_LOOP')(msg) &&
    'chatId' in msg &&
    typeof msg.chatId === 'string' &&
    'userMessage' in msg &&
    typeof msg.userMessage === 'string' &&
    'model' in msg &&
    typeof msg.model === 'string' &&
    (!('image' in msg) || msg.image === undefined || (typeof msg.image === 'object' && msg.image !== null))
  )
}

export function isGetAgentStateRequest(msg: unknown): msg is GetAgentStateRequest {
  return messageOfType('GET_AGENT_STATE')(msg)
}

export function isStopAgentLoopRequest(msg: unknown): msg is StopAgentLoopRequest {
  return messageOfType('STOP_AGENT_LOOP')(msg)
}

export function isAgentEventMessage(msg: unknown): msg is AgentEventMessage {
  return (
    messageOfType('AGENT_EVENT')(msg) &&
    'event' in msg &&
    typeof msg.event === 'object' &&
    msg.event !== null
  )
}

export function isAgentStateResponse(msg: unknown): msg is AgentStateResponse {
  return (
    messageOfType('AGENT_STATE')(msg) &&
    'state' in msg &&
    typeof msg.state === 'object' &&
    msg.state !== null
  )
}
