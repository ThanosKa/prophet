import type { ToolExecutionResult, AgentLoopEvent } from './types'
import type {
  AgentState,
  ToolExecutionResponse,
  AgentEventMessage,
  AgentStateResponse,
} from './messages'

let backgroundPort: chrome.runtime.Port | null = null
const eventListeners: Set<(event: AgentLoopEvent) => void> = new Set()
const stateListeners: Set<(state: AgentState) => void> = new Set()

function ensureConnection(): chrome.runtime.Port {
  if (backgroundPort) {
    return backgroundPort
  }

  backgroundPort = chrome.runtime.connect({ name: 'sidepanel' })

  backgroundPort.onMessage.addListener((message) => {
    if (message.type === 'AGENT_EVENT') {
      const agentEvent = (message as AgentEventMessage).event
      for (const listener of eventListeners) {
        try {
          listener(agentEvent)
        } catch (error) {
          console.error('[BackgroundBridge] Event listener error:', error)
        }
      }
    }

    if (message.type === 'AGENT_STATE') {
      const state = (message as AgentStateResponse).state
      for (const listener of stateListeners) {
        try {
          listener(state)
        } catch (error) {
          console.error('[BackgroundBridge] State listener error:', error)
        }
      }
    }
  })

  backgroundPort.onDisconnect.addListener(() => {
    // console.log('[BackgroundBridge] Disconnected from background')
    backgroundPort = null
  })

  // console.log('[BackgroundBridge] Connected to background')
  return backgroundPort
}

export async function executeToolViaBackground(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<ToolExecutionResult> {
  const requestId = crypto.randomUUID()

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'EXECUTE_TOOL',
        toolName,
        toolInput,
        requestId,
      },
      (response: ToolExecutionResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        if (!response) {
          reject(new Error('No response from background script'))
          return
        }

        if (response.success && response.result) {
          resolve(response.result)
        } else {
          resolve({
            success: false,
            error: response.error || 'Unknown error',
            durationMs: 0,
          })
        }
      }
    )
  })
}

export async function getAgentState(): Promise<AgentState | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_AGENT_STATE' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[BackgroundBridge] Error getting agent state:', chrome.runtime.lastError)
        resolve(null)
        return
      }

      if (response?.type === 'AGENT_STATE') {
        resolve(response.state)
      } else {
        resolve(null)
      }
    })
  })
}

export async function stopAgentLoop(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'STOP_AGENT_LOOP' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[BackgroundBridge] Error stopping agent loop:', chrome.runtime.lastError)
        resolve(false)
        return
      }

      resolve(response?.success ?? false)
    })
  })
}

export function subscribeToAgentEvents(
  callback: (event: AgentLoopEvent) => void
): () => void {
  ensureConnection()
  eventListeners.add(callback)

  return () => {
    eventListeners.delete(callback)
  }
}

export function subscribeToAgentState(
  callback: (state: AgentState) => void
): () => void {
  ensureConnection()
  stateListeners.add(callback)

  return () => {
    stateListeners.delete(callback)
  }
}

export function reconnectToBackground(): void {
  if (backgroundPort) {
    try {
      backgroundPort.disconnect()
    } catch {
      // Ignore disconnect errors
    }
    backgroundPort = null
  }
  ensureConnection()
}

export function isConnected(): boolean {
  return backgroundPort !== null
}
