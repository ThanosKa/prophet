import { createClerkClient } from '@clerk/chrome-extension/background'
import { toolExecutors } from './lib/agent/tools'
import { debuggerManager } from './lib/agent/debugger-manager'
import { snapshotManager } from './lib/agent/snapshot-manager'
import {
  type ExecuteToolRequest,
  type AgentState,
  type ToolExecutionResponse,
  type AgentEventMessage,
  DEFAULT_AGENT_STATE,
  isExecuteToolRequest,
  isGetAgentStateRequest,
  isStopAgentLoopRequest,
} from './lib/agent/messages'
import type { ToolExecutionResult } from './lib/agent/types'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  console.error('[Background] VITE_CLERK_PUBLISHABLE_KEY is not set')
}

// Agent state stored in memory (service worker)
let agentState: AgentState = { ...DEFAULT_AGENT_STATE }
let abortController: AbortController | null = null
const sidepanelPorts: Set<chrome.runtime.Port> = new Set()

// ============================================================================
// Sidepanel Behavior
// ============================================================================

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('[Background] Failed to set sidepanel behavior:', error))

// ============================================================================
// Port-based Communication (for streaming events to sidepanel)
// ============================================================================

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    // console.log('[Background] Sidepanel connected')
    sidepanelPorts.add(port)

    // Send current agent state on connect
    port.postMessage({
      type: 'AGENT_STATE',
      state: agentState,
    })

    // Send any pending events
    for (const event of agentState.pendingEvents) {
      port.postMessage({
        type: 'AGENT_EVENT',
        event,
      } as AgentEventMessage)
    }

    port.onDisconnect.addListener(() => {
      // console.log('[Background] Sidepanel disconnected')
      sidepanelPorts.delete(port)
    })
  }
})

// ============================================================================
// Message Handlers
// ============================================================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Auth token request
  if (message.type === 'GET_AUTH_TOKEN') {
    createClerkClient({ publishableKey })
      .then((clerk) => {
        if (!clerk.session) {
          // console.log('[Background] No active session')
          sendResponse({ token: null })
          return
        }
        return clerk.session.getToken()
      })
      .then((token) => {
        if (token !== undefined) {
          sendResponse({ token })
        }
      })
      .catch(() => {
        sendResponse({ token: null })
      })
    return true
  }

  // Close auth tab request
  if (message.type === 'CLOSE_AUTH_TAB') {
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {
      })
    }
    sendResponse({ success: true })
    return true
  }

  // Tool execution request
  if (isExecuteToolRequest(message)) {
    handleToolExecution(message, sendResponse)
    return true
  }

  // Get agent state request
  if (isGetAgentStateRequest(message)) {
    sendResponse({ type: 'AGENT_STATE', state: agentState })
    return true
  }

  // Stop agent loop request
  if (isStopAgentLoopRequest(message)) {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    agentState = { ...DEFAULT_AGENT_STATE }
    sendResponse({ success: true })
    return true
  }

  // Agent abort request from content script pause button
  if (message.type === 'AGENT_ABORT') {
    // console.log('[Background] Agent abort requested')
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    agentState = { ...DEFAULT_AGENT_STATE }

    // Notify content script to hide overlay
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'AGENT_INACTIVE' }).catch(() => { })
      }
    })

    sendResponse({ success: true })
    return true
  }

  return false
})

// ============================================================================
// Tool Execution Handler
// ============================================================================

async function handleToolExecution(
  request: ExecuteToolRequest,
  sendResponse: (response: ToolExecutionResponse) => void
): Promise<void> {
  const { toolName, toolInput, requestId } = request
  const startTime = Date.now()

  // console.log(`[Background] Executing tool: ${toolName}`, toolInput)

  // Update agent state
  agentState.currentToolExecution = {
    toolName,
    toolInput,
    startedAt: startTime,
  }

  // Send status update to content script with friendly message
  const statusMessages: Record<string, (input: Record<string, unknown>) => string> = {
    navigate: (input) => `Navigating to ${input.url}...`,
    take_snapshot: () => 'Analyzing page elements...',
    click_element_by_uid: () => 'Clicking element...',
    fill_element_by_uid: (input) => `Filling input with "${input.value}"...`,
    hover_element_by_uid: () => 'Hovering over element...',
    scroll_page: (input) => `Scrolling ${input.direction}...`,
    get_page_content: () => 'Reading page content...',
    search_snapshot: (input) => `Searching for "${input.query}"...`,
    press_key: (input) => `Pressing ${input.key}...`,
    take_screenshot: () => 'Taking screenshot...',
  }

  const statusMessage = statusMessages[toolName]?.(toolInput) || `Executing ${toolName}...`
  await sendAgentStatus(statusMessage)

  const executor = toolExecutors[toolName]
  if (!executor) {
    const response: ToolExecutionResponse = {
      type: 'TOOL_RESULT',
      requestId,
      success: false,
      error: `Unknown tool: ${toolName}`,
    }
    agentState.currentToolExecution = null
    sendResponse(response)
    return
  }

  try {
    const result = await executor(toolInput)
    const durationMs = Date.now() - startTime

    console.log(`[Background] Tool ${toolName} completed in ${durationMs}ms`, result.success)

    // Send visual feedback to content script for element interactions
    await sendVisualFeedback(toolName, toolInput, result)

    const response: ToolExecutionResponse = {
      type: 'TOOL_RESULT',
      requestId,
      success: true,
      result: {
        ...result,
        durationMs,
      },
    }

    agentState.currentToolExecution = null
    sendResponse(response)
  } catch (error) {
    const durationMs = Date.now() - startTime
    console.error(`[Background] Tool ${toolName} failed:`, error)

    const response: ToolExecutionResponse = {
      type: 'TOOL_RESULT',
      requestId,
      success: false,
      error: error instanceof Error ? error.message : `Failed to execute tool: ${toolName}`,
      result: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      },
    }

    agentState.currentToolExecution = null
    sendResponse(response)
  }
}

// ============================================================================
// Visual Feedback to Content Script
// ============================================================================

async function sendAgentStatus(status: string): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return

    await chrome.tabs.sendMessage(tab.id, {
      type: 'AGENT_STATUS_UPDATE',
      status,
    })
  } catch (error) {
    console.debug('[Background] Could not send status update:', error)
  }
}

async function sendVisualFeedback(
  toolName: string,
  toolInput: Record<string, unknown>,
  result: ToolExecutionResult
): Promise<void> {
  if (!result.success) return

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) return

    const uid = toolInput.uid as string | undefined

    switch (toolName) {
      case 'click_element_by_uid':
        if (uid) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_CLICK_INDICATOR',
            uid,
          })
        }
        break

      case 'fill_element_by_uid':
        if (uid) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_FILL_INDICATOR',
            uid,
            value: toolInput.value as string,
          })
        }
        break

      case 'hover_element_by_uid':
        if (uid) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_HOVER_INDICATOR',
            uid,
          })
        }
        break

      case 'take_snapshot':
        // Clear all highlights when taking a new snapshot
        await chrome.tabs.sendMessage(tab.id, {
          type: 'CLEAR_HIGHLIGHTS',
        })
        break
    }
  } catch (error) {
    // Content script might not be loaded, ignore
    console.debug('[Background] Could not send visual feedback:', error)
  }
}

// ============================================================================
// Cleanup on Tab Close
// ============================================================================

chrome.tabs.onRemoved.addListener((tabId) => {
  // Let debugger manager handle its own cleanup
  debuggerManager.handleTabRemoved(tabId)
  snapshotManager.clearSnapshot(tabId)
})

// ============================================================================
// Export for testing
// ============================================================================

export { agentState, debuggerManager, snapshotManager }
