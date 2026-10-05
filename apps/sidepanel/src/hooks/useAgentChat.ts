import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { useAgentStore } from '@/store/agentStore'
import { useReviewPromptStore } from '@/store/reviewPromptStore'
import { runAgentLoop } from '@/lib/agent'
import { config } from '@/lib/config'
import { chatAdapter } from '@/lib/agent/chat-adapter'
import { mockAgentStream } from '@/lib/agent/mock-agent'
import { USER_FACING_TEXT, describeThrownError, parseErrorDetails, type ErrorInfo } from '@/lib/user-facing-errors'
import type { Message, ImageData, AgentStatus, ToolCall } from '@prophet/shared'

export interface AgentMessage extends Message {
  streamingContent?: string
}

export function useAgentChat() {
  const { addMessage: addLegacyMessage, updateMessage: updateLegacyMessage, setStreaming } = useChatStore()
  const { selectedModel, setContextUsage, enableThinking } = useUIStore()
  const { createAbortController, abort: abortAgentStore, setActive, clearActions } = useAgentStore()
  const [error, setError] = useState<string | null>(null)
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null) // Legacy support for ChatView
  // Each sendMessage owns its run. Shared state (streaming flag, overlay) may only be torn down by the
  // run that is still current, so a stopped run finishing late can never end or abort a newer one.
  const activeRunRef = useRef<AbortController | null>(null)
  const overlayTabIdRef = useRef<number | null>(null)
  const overlayListenersRef = useRef<{
    onUpdated: (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => void
    onActivated: (activeInfo: chrome.tabs.TabActiveInfo) => void
  } | null>(null)

  const adapter = useMemo(() => chatAdapter, [])

  const clearBanner = useCallback(() => {
    setError(null)
    setErrorInfo(null)
    setRetryAfter(null)
    setRemaining(null)
    setNotice(null)
  }, [])

  const showError = useCallback(
    (message: string) => {
      clearBanner()
      setError(message)
    },
    [clearBanner]
  )

  useEffect(
    () =>
      useChatStore.subscribe((state, prev) => {
        if (state.activeChatId !== prev.activeChatId) clearBanner()
      }),
    [clearBanner]
  )

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
      activeRunRef.current?.abort()

      // Activate agent overlay
      setActive(true)
      const run = createAbortController()
      activeRunRef.current = run
      const { signal } = run

      try {
        clearBanner()
        setStatus('submitted')
        setStreaming(true)
        setCurrentToolCall(null)
        clearActions()

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

        // Use mock agent when VITE_USE_DEV_API=mock for UI/UX testing
        // Use dev endpoint when VITE_USE_DEV_API=true to bypass credits
        // Otherwise use production endpoint
        const eventStream = config.useMockApi
          ? mockAgentStream(chatId, content, selectedModel, signal, enableThinking)
          : runAgentLoop(
              config.useDevApi
                ? `${config.apiUrl}/api/agent/chat/dev`
                : `${config.apiUrl}/api/agent/chat`,
              chatId,
              content,
              selectedModel,
              image,
              signal,
              enableThinking
            )

        // A run counts as successful when the final turn completes without an error event.
        // These two events are only emitted once the model finishes without requesting more tools.
        let finishedCleanly = false
        let sawError = false
        let truncated = false

        for await (const event of eventStream) {
          if (signal.aborted) break

          if (event.type === 'output_truncated') {
            truncated = true
            setNotice(event.reducedForBalance ? USER_FACING_TEXT.truncatedLowBalance : USER_FACING_TEXT.truncated)
            continue
          }

          if (event.type === 'turn_limit_reached') {
            setNotice(USER_FACING_TEXT.turnLimit)
            continue
          }

          // Legacy: Handle currentToolCall
          if (event.type === 'tool_call_start' && event.toolCallId && event.toolName) {
            setCurrentToolCall({
              id: event.toolCallId,
              name: event.toolName as ToolCall['name'],
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
              thinkingContent: uiMessage.thinkingContent,
              toolCalls: toolCalls.length > 0 ? (toolCalls as ToolCall[]) : undefined,
              parts: uiMessage.parts,
              inputTokens: uiMessage.inputTokens,
              outputTokens: uiMessage.outputTokens,
            })
          }

          // Each request carries the whole conversation, so its prompt size replaces
          // the context reading instead of adding to it.
          if (event.type === 'metrics_update' && event.metrics) {
            setContextUsage({
              contextTokens: event.metrics.inputTokens + event.metrics.outputTokens,
              contextInputTokens: event.metrics.inputTokens,
              contextOutputTokens: event.metrics.outputTokens,
              contextReasoningTokens: 0,
              contextCachedInputTokens: event.metrics.cacheReadInputTokens ?? 0,
            })
          }

          if (event.type === 'done' || event.type === 'execution_complete') finishedCleanly = true

          // Handle errors
          if (event.type === 'error') {
            sawError = true
            const details = parseErrorDetails(event.details)
            setStatus('error')
            setError(event.error || USER_FACING_TEXT.generic)
            setErrorInfo({
              code: event.code,
              pricingUrl: details?.pricingUrl,
              suggestedModel: details?.suggestedModel,
              suggestDisableThinking: details?.suggestDisableThinking,
              canUpgrade: details?.canUpgrade,
            })
            if (details?.retryAfter !== undefined) {
              setRetryAfter(details.retryAfter)
            }
            if (details?.remaining !== undefined) {
              setRemaining(details.remaining)
            }
          }
        }

        if (finishedCleanly && !sawError && !truncated && !signal.aborted) {
          void useReviewPromptStore.getState().recordSuccessfulRun()
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('[useAgentChat] Agent run failed:', err)
          setStatus('error')
          setError(describeThrownError(err))
        }
      } finally {
        if (activeRunRef.current === run) {
          activeRunRef.current = null
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
      }
    },
    [
      addLegacyMessage,
      updateLegacyMessage,
      setStreaming,
      selectedModel,
      setContextUsage,
      status,
      adapter,
      createAbortController,
      setActive,
      clearActions,
      cleanupOverlayListeners,
      sendAgentActiveToTab,
      enableThinking,
      clearBanner,
    ]
  )

  const abort = useCallback(() => {
    setStreaming(false)  // Immediate feedback - stop spinner
    // The ref is left set so the stopped run's own finally still removes the page overlay.
    activeRunRef.current?.abort()
    abortAgentStore()
    adapter.clear()
    setCurrentToolCall(null)
  }, [abortAgentStore, adapter, setStreaming])

  return {
    sendMessage,
    abort,
    error,
    setError,
    showError,
    errorInfo,
    notice,
    setNotice,
    retryAfter,
    remaining,
    currentToolCall,
  }
}
