import { useState, useCallback, useRef, useMemo } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useUIStore } from '@/store/uiStore'
import { useAgentStore } from '@/store/agentStore'
import { runAgentLoop } from '@/lib/agent'
import { config } from '@/lib/config'
import { chatAdapter } from '@/lib/agent/chat-adapter'
import { logFrontendEvent } from '@/lib/frontend-logger'
import type { Message, ImageData, AgentStatus, ToolCall } from '@prophet/shared'

export interface AgentMessage extends Message {
  streamingContent?: string
}

export function useAgentChat() {
  const { addMessage: addLegacyMessage, updateMessage: updateLegacyMessage, setStreaming } = useChatStore()
  const { selectedModel, addContextUsage } = useUIStore()
  const { createAbortController, abort: abortAgentStore, setActive } = useAgentStore()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [currentToolCall, setCurrentToolCall] = useState<ToolCall | null>(null) // Legacy support for ChatView
  const abortRef = useRef<boolean>(false)
  const activeStreamRef = useRef<{ chatId: string; abort: () => void } | null>(null)
  const streamLogBufferRef = useRef<string>('')
  const streamLogFlushTimerRef = useRef<number | null>(null)

  // AIPEX Pattern: Use ChatAdapter for event processing
  const adapter = useMemo(() => chatAdapter, [])

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
        await logFrontendEvent(chatId, 'user_message', content)
        setError(null)
        setStatus('submitted')
        setStreaming(true)
        setCurrentToolCall(null)
        abortRef.current = false

        // Activate agent overlay
        setActive(true)
        const abortController = createAbortController()

        // Send AGENT_ACTIVE to content script
        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'AGENT_ACTIVE' }).catch(() => { })
          }
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

          // Frontend-visible logging (dev only)
          if (event.type === 'content_delta' && event.delta) {
            streamLogBufferRef.current += event.delta
            if (streamLogFlushTimerRef.current === null) {
              streamLogFlushTimerRef.current = window.setTimeout(async () => {
                const buffered = streamLogBufferRef.current
                streamLogBufferRef.current = ''
                streamLogFlushTimerRef.current = null
                if (buffered.trim()) {
                  await logFrontendEvent(chatId, 'assistant_stream', buffered)
                }
              }, 750)
            }
          }

          if (event.type === 'tool_call_start') {
            const params = (event.params as Record<string, unknown> | undefined) ?? {}
            const url = typeof params.url === 'string' ? params.url : undefined
            const value = typeof params.value === 'string' ? params.value : undefined
            const key = typeof params.key === 'string' ? params.key : undefined
            const summary =
              event.toolName === 'navigate' && url ? `Navigate: ${url}`
                : event.toolName === 'fill_element_by_uid' && value ? `Type: "${value}"`
                  : event.toolName === 'press_key' && key ? `Press: ${key}`
                    : `${event.toolName}`
            await logFrontendEvent(chatId, 'tool_start', summary)
          }

          if (event.type === 'tool_call_complete') {
            const resultText =
              typeof event.result === 'string'
                ? event.result.replace(/uid="[^"]+"/g, 'uid="[hidden]"')
                : 'Done'
            await logFrontendEvent(chatId, 'tool_complete', `${event.toolName}: ${resultText}`)
          }

          if (event.type === 'tool_call_error') {
            await logFrontendEvent(chatId, 'tool_error', `${event.toolName}: ${event.error}`)
          }

          if (event.type === 'execution_complete') {
            if (streamLogFlushTimerRef.current !== null) {
              window.clearTimeout(streamLogFlushTimerRef.current)
              streamLogFlushTimerRef.current = null
            }
            const buffered = streamLogBufferRef.current
            streamLogBufferRef.current = ''
            if (buffered.trim()) {
              await logFrontendEvent(chatId, 'assistant_stream', buffered)
            }
            if (event.finalOutput) {
              await logFrontendEvent(chatId, 'assistant_final', event.finalOutput)
            }
          }

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
        if (streamLogFlushTimerRef.current !== null) {
          window.clearTimeout(streamLogFlushTimerRef.current)
          streamLogFlushTimerRef.current = null
        }
        streamLogBufferRef.current = ''
        if (activeStreamRef.current?.chatId === chatId) {
          activeStreamRef.current = null
        }
        setStreaming(false)
        if (status !== 'error') setStatus('idle')
        setCurrentToolCall(null)

        // Deactivate agent overlay
        setActive(false)
        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
          if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'AGENT_INACTIVE' }).catch(() => { })
          }
        })
      }
    },
    [addLegacyMessage, updateLegacyMessage, setStreaming, selectedModel, addContextUsage, status, adapter, createAbortController, setActive]
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
