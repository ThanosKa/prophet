import { createClerkClient } from '@clerk/chrome-extension/background'
import { toolExecutors } from './lib/agent/tools'
import { debuggerManager } from './lib/agent/debugger-manager'
import { snapshotManager } from './lib/agent/snapshot-manager'
import { logger } from './lib/logger'
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

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  logger.error('Background', 'VITE_CLERK_PUBLISHABLE_KEY is not set')
}

let agentState: AgentState = { ...DEFAULT_AGENT_STATE }
let abortController: AbortController | null = null
const sidepanelPorts: Set<chrome.runtime.Port> = new Set()

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => logger.error('Background', 'Failed to set sidepanel behavior:', error))

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    logger.log('Background', 'Sidepanel connected')
    sidepanelPorts.add(port)

    port.postMessage({
      type: 'AGENT_STATE',
      state: agentState,
    })

    for (const event of agentState.pendingEvents) {
      port.postMessage({
        type: 'AGENT_EVENT',
        event,
      } satisfies AgentEventMessage)
    }

    port.onDisconnect.addListener(() => {
      logger.log('Background', 'Sidepanel disconnected')
      sidepanelPorts.delete(port)
    })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_AUTH_TOKEN') {
    createClerkClient({ publishableKey })
      .then((clerk) => {
        if (!clerk.session) {
          logger.log('Background', 'No active session')
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

  if (message.type === 'CLOSE_AUTH_TAB') {
    if (sender.tab?.id) {
      chrome.tabs.remove(sender.tab.id).catch(() => {
      })
    }
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'OPEN_SIDE_PANEL') {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId })
        .catch((err) => logger.error('Background', 'Failed to open side panel:', err))
    }
    sendResponse({ success: true })
    return true
  }

  if (isExecuteToolRequest(message)) {
    handleToolExecution({ request: message, sendResponse })
    return true
  }

  if (isGetAgentStateRequest(message)) {
    sendResponse({ type: 'AGENT_STATE', state: agentState })
    return true
  }

  if (isStopAgentLoopRequest(message)) {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    agentState = { ...DEFAULT_AGENT_STATE }
    sendResponse({ success: true })
    return true
  }

  if (message.type === 'AGENT_ABORT') {
    logger.log('Background', 'Agent abort requested')
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    agentState = { ...DEFAULT_AGENT_STATE }

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

async function handleToolExecution({
  request,
  sendResponse,
}: {
  request: ExecuteToolRequest
  sendResponse: (response: ToolExecutionResponse) => void
}): Promise<void> {
  const { toolName, toolInput, requestId } = request
  const startTime = Date.now()

  logger.log('Background', `Executing tool: ${toolName}`, toolInput)

  agentState.currentToolExecution = {
    toolName,
    toolInput,
    startedAt: startTime,
  }

  const statusMessages: Record<string, (input: Record<string, unknown>) => string> = {
    navigate: (input) => `Navigating to ${input.url}...`,
    take_snapshot: () => 'Analyzing page elements...',
    click_element_by_uid: () => 'Clicking element...',
    fill_element_by_uid: (input) => `Filling input with "${input.value}"...`,
    hover_element_by_uid: () => 'Hovering over element...',
    scroll_page: (input) => `Scrolling ${input.direction}...`,
    get_page_content: () => 'Reading page content...',
    search_snapshot: (input) => `Searching for "${input.query}"...`,
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

    logger.log('Background', `Tool ${toolName} completed in ${durationMs}ms`, result.success)

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
    logger.error('Background', `Tool ${toolName} failed:`, error)

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

async function sendAgentStatus(status: string): Promise<void> {
  const statusEvent = {
    type: 'AGENT_STATUS_UPDATE',
    status,
  }

  for (const port of sidepanelPorts) {
    try {
      port.postMessage(statusEvent)
    } catch {
      sidepanelPorts.delete(port)
    }
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  debuggerManager.handleTabRemoved(tabId)
  snapshotManager.clearSnapshot(tabId)
})

export { agentState, debuggerManager, snapshotManager }
