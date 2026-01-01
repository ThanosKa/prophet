import { useState, useCallback, useRef, useMemo } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { useAgentStore } from '@/store/agentStore'
import { runAgentLoop } from '@/lib/agent'
import { config } from '@/lib/config'
import { chatAdapter } from '@/lib/agent/chat-adapter'
import type { Message, ImageData, AgentStatus, ToolCall } from '@prophet/shared'

export interface AgentMessage extends Message {
  streamingContent?: string
}

export function useAgentChat() {
  const { addMessage: addLegacyMessage, updateMessage: updateLegacyMessage, setStreaming } = useChatStore()
  const { selectedModel, addContextUsage } = useUIStore()
  const { createAbortController, abort: abortAgentStore, setActive, clearActions } = useAgentStore()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null) // Legacy support for ChatView
  const abortRef = useRef<boolean>(false)
  const activeStreamRef = useRef<{ chatId: string; abort: () => void } | null>(null)
  const overlayTabIdRef = useRef<number | null>(null)
  const overlayListenersRef = useRef<{
    onUpdated: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void
    onActivated: (activeInfo: chrome.tabs.TabActiveInfo) => void
  } | null>(null)

  const adapter = useMemo(() => chatAdapter, [])

  const cleanupOverlayListeners = useCallback(() => {
    const listeners = overlayListenersRef.current
    if (listeners) {
      chrome.tabs.onUpdated.removeListener(listeners.onUpdated)
      chrome.tabs.onActivated.removeListener(listeners.onActivated)
      overlayListenersRef.current = null
    }
    overlayTabIdRef.current = null
  }, [])

  const sendAgentActiveToTab = useCallback((tabId: number) => {
    chrome.tabs.sendMessage(tabId, { type: 'AGENT_ACTIVE' }).catch(() => {
      // Content script may not be ready immediately after navigation; retry once.
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { type: 'AGENT_ACTIVE' }).catch(() => { })
      }, 250)
    })
  }, [])

  const sendMessage = useCallback(
    async (chatId: string, content: string, image?: ImageData) => {
      if (activeStreamRef.current && activeStreamRef.current.chatId !== chatId) {
        activeStreamRef.current.abort()
      }

      const abortStream = () => {
        abortRef.current = true
      }
      activeStreamRef.current = { chatId, abort: abortStream }

      try {
        setError(null)
        setStatus('submitted')
        setStreaming(true)
        setCurrentToolCall(null)
        abortRef.current = false
        clearActions()

        // Activate agent overlay
        setActive(true)
        const abortController = createAbortController()

        cleanupOverlayListeners()

        // Ensure the overlay persists through full navigations and tab switches while running.
        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
          if (!tab?.id) return

          overlayTabIdRef.current = tab.id
          sendAgentActiveToTab(tab.id)

          const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (updatedTabId !== overlayTabIdRef.current) return
            if (changeInfo.status === 'complete') {
              sendAgentActiveToTab(updatedTabId)
            }
          }

          const onActivated = (activeInfo: chrome.tabs.TabActiveInfo) => {
            const prevTabId = overlayTabIdRef.current
            overlayTabIdRef.current = activeInfo.tabId

            if (prevTabId && prevTabId !== activeInfo.tabId) {
              chrome.tabs.sendMessage(prevTabId, { type: 'AGENT_INACTIVE' }).catch(() => { })
            }

            sendAgentActiveToTab(activeInfo.tabId)
          }

          chrome.tabs.onUpdated.addListener(onUpdated)
          chrome.tabs.onActivated.addListener(onActivated)
          overlayListenersRef.current = { onUpdated, onActivated }
        })

        // Create user message via adapter
        const userMessageId = crypto.randomUUID()
        const userMessage = adapter.addUserMessage(userMessageId, image ? `${content}\n[Image attached]` : content)

        // Convert UIMessage to legacy Message format for store
        addLegacyMessage(chatId, {
          id: userMessage.id,
          chatId,
          role: 'user',
          content: adapter.getTextContent(userMessage),
          createdAt: userMessage.createdAt,
        })

        // Create assistant message via adapter
        const assistantMessageId = crypto.randomUUID()
        const assistantMessage = adapter.startAssistantMessage(assistantMessageId)

        addLegacyMessage(chatId, {
          id: assistantMessage.id,
          chatId,
          role: 'assistant',
          content: '',
          createdAt: assistantMessage.createdAt,
        })

        // Use dev endpoint when VITE_USE_DEV_API=true to bypass credits
        const apiUrl = config.useDevApi
          ? `${config.apiUrl}/api/agent/chat/dev`
          : `${config.apiUrl}/api/agent/chat`

        for await (const event of runAgentLoop(
          apiUrl,
          chatId,
          content,
          selectedModel,
          image,
          abortController.signal
        )) {
          if (abortRef.current) break

          // Legacy: Handle currentToolCall
          if (event.type === 'tool_call_start') {
            setCurrentToolCall({
              id: event.toolCallId,
              name: event.toolName,
              input: (event.params as Record<string, unknown>) || {},
            })
          } else if (event.type === 'tool_call_complete' || event.type === 'tool_call_error') {
            setCurrentToolCall(null)
          }

          // Process event through ChatAdapter
          const changedMessages = adapter.processEvent(event)

          // Update status from adapter
          const adapterStatus = adapter.getStatus()
          if (adapterStatus !== status) {
            setStatus(adapterStatus)
          }

          // Sync changed messages to legacy store
          for (const uiMessage of changedMessages) {
            const toolCalls = adapter.extractToolCalls(uiMessage)
            updateLegacyMessage(chatId, uiMessage.id, {
              content: adapter.getTextContent(uiMessage),
              toolCalls: toolCalls.length > 0 ? (toolCalls as ToolCall[]) : undefined,
              inputTokens: uiMessage.inputTokens,
              outputTokens: uiMessage.outputTokens,
            })
          }

          // Handle metrics separately
          if (event.type === 'metrics_update' && event.metrics) {
            addContextUsage({
              inputTokens: event.metrics.inputTokens,
              outputTokens: event.metrics.outputTokens,
            })
          }

          // Handle errors
          if (event.type === 'error') {
            setStatus('error')
            setError(event.error || 'Agent execution failed')
          }
        }
      } catch (err) {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Agent error')
      } finally {
        if (activeStreamRef.current?.chatId === chatId) {
          activeStreamRef.current = null
        }
        setStreaming(false)
        if (status !== 'error') setStatus('idle')
        setCurrentToolCall(null)

        // Deactivate agent overlay
        setActive(false)
        const lastOverlayTabId = overlayTabIdRef.current
        cleanupOverlayListeners()
        if (lastOverlayTabId) {
          chrome.tabs.sendMessage(lastOverlayTabId, { type: 'AGENT_INACTIVE' }).catch(() => { })
        } else {
          chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            if (tab?.id) {
              chrome.tabs.sendMessage(tab.id, { type: 'AGENT_INACTIVE' }).catch(() => { })
            }
          })
        }
      }
    },
    [
      addLegacyMessage,
      updateLegacyMessage,
      setStreaming,
      selectedModel,
      addContextUsage,
      status,
      adapter,
      createAbortController,
      setActive,
      clearActions,
      cleanupOverlayListeners,
      sendAgentActiveToTab,
    ]
  )

  const abort = useCallback(() => {
    if (activeStreamRef.current) {
      activeStreamRef.current.abort()
      activeStreamRef.current = null
    }
    abortAgentStore()
    adapter.clear()
    setCurrentToolCall(null)
  }, [abortAgentStore, adapter])

  return {
    sendMessage,
    abort,
    error,
    setError,
    currentToolCall,
  }
}
