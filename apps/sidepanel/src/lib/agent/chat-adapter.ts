/**
 * ChatAdapter - The "Nervous System" from AIPEX Pattern
 * 
 * Converts raw agent events into structured UI messages.
 * Bundles multiple tool calls into a single message.
 * Handles text/tool interleaving correctly.
 */

import type { AgentStatus } from '@prophet/shared'

// Message part types for interleaving
export interface TextPart {
    type: 'text'
    text: string
}

export interface ToolPart {
    type: 'tool'
    toolCallId: string
    toolName: string
    state: 'executing' | 'completed' | 'error'
    input?: Record<string, unknown>
    output?: string
    error?: string
}

export type MessagePart = TextPart | ToolPart

export interface UIMessage {
    id: string
    role: 'user' | 'assistant'
    parts: MessagePart[]
    createdAt: Date
    inputTokens?: number
    outputTokens?: number
}

export interface AgentEvent {
    type: string
    delta?: string
    toolCallId?: string
    toolName?: string
    params?: unknown
    result?: unknown
    error?: string
    metrics?: {
        inputTokens?: number
        outputTokens?: number
    }
    finalOutput?: string
}

export class ChatAdapter {
    private messages: Map<string, UIMessage> = new Map()
    private currentAssistantId: string | null = null
    private pendingToolCalls: Map<string, string> = new Map() // toolCallId -> toolName
    private status: AgentStatus = 'idle'

    /**
     * Process an agent event and return the updated message(s).
     * Returns only the messages that changed.
     */
    processEvent(event: AgentEvent): UIMessage[] {
        const changedMessages: UIMessage[] = []

        switch (event.type) {
            case 'session_created':
                // No message change needed
                break

            case 'content_delta':
                if (event.delta) {
                    const msg = this.updateCurrentAssistant((m) => {
                        const lastPart = m.parts[m.parts.length - 1]

                        // If the last part is text, append to it
                        if (lastPart && lastPart.type === 'text') {
                            lastPart.text += event.delta
                        } else {
                            // Otherwise push a new text part
                            m.parts.push({ type: 'text', text: event.delta! })
                        }

                        return m
                    })
                    if (msg) changedMessages.push(msg)
                    this.status = 'streaming'
                }
                break

            case 'tool_call_start':
                if (event.toolCallId && event.toolName) {
                    this.pendingToolCalls.set(event.toolCallId, event.toolName)

                    const msg = this.updateCurrentAssistant((m) => {
                        m.parts.push({
                            type: 'tool',
                            toolCallId: event.toolCallId!,
                            toolName: event.toolName!,
                            state: 'executing',
                            input: event.params as Record<string, unknown>,
                        })
                        return m
                    })
                    if (msg) changedMessages.push(msg)
                    this.status = 'executing_tools'
                }
                break

            case 'tool_call_complete':
                if (event.toolCallId) {
                    const msg = this.updateCurrentAssistant((m) => {
                        const part = m.parts.find(
                            (p): p is ToolPart =>
                                p.type === 'tool' && p.toolCallId === event.toolCallId
                        )

                        if (part) {
                            part.state = 'completed'
                            part.output = event.result as string
                        }

                        return m
                    })
                    if (msg) changedMessages.push(msg)
                    this.pendingToolCalls.delete(event.toolCallId)
                    this.status = 'streaming'
                }
                break

            case 'tool_call_error':
                if (event.toolCallId) {
                    const msg = this.updateCurrentAssistant((m) => {
                        const part = m.parts.find(
                            (p): p is ToolPart =>
                                p.type === 'tool' && p.toolCallId === event.toolCallId
                        )

                        if (part) {
                            part.state = 'error'
                            part.error = event.error
                        }

                        return m
                    })
                    if (msg) changedMessages.push(msg)
                    this.pendingToolCalls.delete(event.toolCallId)
                }
                break

            case 'metrics_update':
                if (event.metrics) {
                    const msg = this.updateCurrentAssistant((m) => {
                        m.inputTokens = (m.inputTokens || 0) + (event.metrics!.inputTokens || 0)
                        m.outputTokens = (m.outputTokens || 0) + (event.metrics!.outputTokens || 0)
                        return m
                    })
                    if (msg) changedMessages.push(msg)
                }
                break

            case 'execution_complete':
                if (event.finalOutput) {
                    const msg = this.updateCurrentAssistant((m) => {
                        // Replace all text parts with final output
                        const toolParts = m.parts.filter((p): p is ToolPart => p.type === 'tool')
                        m.parts = [
                            { type: 'text', text: event.finalOutput! },
                            ...toolParts,
                        ]
                        if (event.metrics) {
                            m.inputTokens = event.metrics.inputTokens
                            m.outputTokens = event.metrics.outputTokens
                        }
                        return m
                    })
                    if (msg) changedMessages.push(msg)
                }
                this.status = 'idle'
                break

            case 'error': {
                const msg = this.updateCurrentAssistant((m) => {
                    m.parts.push({ type: 'text', text: event.error || 'Unknown error' })
                    return m
                })
                if (msg) changedMessages.push(msg)
                this.status = 'error'
                break
            }

            case 'done':
                this.currentAssistantId = null
                this.status = 'idle'
                break
        }

        return changedMessages
    }

    /**
     * Start a new user message.
     */
    addUserMessage(id: string, content: string): UIMessage {
        const message: UIMessage = {
            id,
            role: 'user',
            parts: [{ type: 'text', text: content }],
            createdAt: new Date(),
        }
        this.messages.set(id, message)
        return message
    }

    /**
     * Start a new assistant message.
     */
    startAssistantMessage(id: string): UIMessage {
        const message: UIMessage = {
            id,
            role: 'assistant',
            parts: [],
            createdAt: new Date(),
        }
        this.messages.set(id, message)
        this.currentAssistantId = id
        return message
    }

    /**
     * Get current status.
     */
    getStatus(): AgentStatus {
        return this.status
    }

    /**
     * Get all messages.
     */
    getMessages(): UIMessage[] {
        return Array.from(this.messages.values())
    }

    /**
     * Get a message by ID.
     */
    getMessage(id: string): UIMessage | undefined {
        return this.messages.get(id)
    }

    /**
   * Convert UIMessage to legacy ToolCall array for compatibility.
   */
    extractToolCalls(message: UIMessage): Array<{
        id: string
        name: string
        input: Record<string, unknown>
        result?: string
    }> {
        return message.parts
            .filter((p): p is ToolPart => p.type === 'tool')
            .map((p) => ({
                id: p.toolCallId,
                name: p.toolName,
                input: (p.input as Record<string, unknown>) || {},
                result: p.output,
            }))
    }

    /**
     * Get plain text content from message.
     */
    getTextContent(message: UIMessage): string {
        return message.parts
            .filter((p): p is TextPart => p.type === 'text')
            .map((p) => p.text)
            .join('')
    }

    /**
     * Clear all messages.
     */
    clear(): void {
        this.messages.clear()
        this.currentAssistantId = null
        this.pendingToolCalls.clear()
        this.status = 'idle'
    }

    /**
     * Update the current assistant message.
     */
    private updateCurrentAssistant(
        updater: (message: UIMessage) => UIMessage
    ): UIMessage | null {
        if (!this.currentAssistantId) return null

        const message = this.messages.get(this.currentAssistantId)
        if (!message) return null

        const updated = updater(message)
        this.messages.set(this.currentAssistantId, updated)
        return updated
    }
}

export const chatAdapter = new ChatAdapter()
