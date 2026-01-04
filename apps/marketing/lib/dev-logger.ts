/**
 * Dev Logger for LLM Interactions
 * 
 * Logs all LLM requests and responses to log.txt when NODE_ENV=development
 * Provides formatted output showing model, user messages, JSON payloads, and responses.
 */

import { writeFile, appendFile, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

// Use absolute path to ensure consistency across different route contexts
const LOG_DIR = resolve(process.cwd(), 'logs')
const LOG_FILE_PATH = join(LOG_DIR, 'response.txt')

export class DevLogger {
    private isDev: boolean
    private buffer: string[] = []

    constructor() {
        // More permissive check for development logging
        this.isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
        
        if (this.isDev) {
            console.log(`[DevLogger] Initialized. Logs will be written to: ${LOG_DIR}`)
        }
    }

    private async ensureLogDir(): Promise<void> {
        try {
            await mkdir(LOG_DIR, { recursive: true })
        } catch {
            // Ignore if directory already exists
        }
    }

    /**
     * Log an LLM request (before streaming)
     */
    async logRequest(
        model: string,
        messages: MessageParam[],
        systemPrompt?: string,
        options?: { enableThinking?: boolean; [key: string]: unknown }
    ): Promise<void> {
        if (!this.isDev) return

        await this.ensureLogDir()
        const timestamp = new Date().toISOString()

        // Extract user message
        const lastMessage = messages[messages.length - 1]
        const userMessage = this.extractTextFromMessage(lastMessage)

        // LLM Input (all messages as text)
        const llmInput = messages.map(m => `[${m.role.toUpperCase()}]: ${this.extractTextFromMessage(m)}`).join('\n')

        // Format JSON sent to LLM (sanitize base64 data and truncate system prompt)
        const sanitizedMessages = this.sanitizeMessagesForLogging(messages)
        const MAX_SYSTEM_PROMPT_LENGTH = 1000
        const truncatedSystemPrompt = systemPrompt && systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH
            ? `${systemPrompt.slice(0, MAX_SYSTEM_PROMPT_LENGTH)}...\n\n[TRUNCATED - Original length: ${systemPrompt.length} chars]`
            : systemPrompt

        const jsonSent = JSON.stringify(
            {
                model,
                system: truncatedSystemPrompt,
                messages: sanitizedMessages,
                enableThinking: options?.enableThinking ?? false,
                ...Object.fromEntries(
                    Object.entries(options ?? {}).filter(([k]) => k !== 'enableThinking')
                ),
            },
            null,
            2
        )

        const logBlock = `
===================================================================================================
${timestamp}
MODEL: ${model}
===================================================================================================

LLM INPUT

${llmInput}

USER MESSAGE

${userMessage}

-----

RAW LLM CALL (json)

${jsonSent}

---------------------------------------------------------------------------------------------------
`

        this.buffer.push(logBlock)

        // Write immediately in case of crash
        try {
            await appendFile(LOG_FILE_PATH, logBlock, 'utf-8')
        } catch (_err) {
            console.error('[DevLogger] Failed to write to log file:', _err)
        }
    }

    /**
     * Log LLM response (after streaming completes)
     */
    async logResponse(responseText: string, usage?: { input_tokens: number; output_tokens: number }): Promise<void> {
        if (!this.isDev) return

        await this.ensureLogDir()
        const responseBlock = `
RESPONSE OF LLM
===================================================================================================

${responseText}

${usage ? `\nTokens: Input=${usage.input_tokens}, Output=${usage.output_tokens}` : ''}

===================================================================================================
END OF RESPONSE
===================================================================================================

`

        this.buffer.push(responseBlock)

        try {
            await appendFile(LOG_FILE_PATH, responseBlock, 'utf-8')
        } catch (_err) {
            console.error('[DevLogger] Failed to write response to log file:', _err)
        }
    }

    /**
     * Log an error
     */
    async logError(error: Error | string): Promise<void> {
        if (!this.isDev) return

        const errorBlock = `
❌ ERROR:
${error instanceof Error ? error.message : error}
${error instanceof Error && error.stack ? `\nStack:\n${error.stack}` : ''}

===================================================================================================

`

        this.buffer.push(errorBlock)

        try {
            await appendFile(LOG_FILE_PATH, errorBlock, 'utf-8')
        } catch (_err) {
            console.error('[DevLogger] Failed to write error to log file:', _err)
        }
    }

    /**
     * Clear the log file (useful at server startup)
     */
    async clearLog(): Promise<void> {
        if (!this.isDev) return

        try {
            const header = `
===================================================================================================
PROPHET DEV LOG - ${new Date().toLocaleString()}
===================================================================================================
This file contains all LLM interactions captured in development mode.
Each request shows: Model, User Message, JSON Sent, and Response.
===================================================================================================

`
            await writeFile(LOG_FILE_PATH, header, 'utf-8')
        } catch (_err) {
            console.error('[DevLogger] Failed to clear log file:', _err)
        }
    }

    /**
     * Extract text from Anthropic message format
     */
    private extractTextFromMessage(message: MessageParam): string {
        if (typeof message.content === 'string') {
            return message.content
        }

        if (Array.isArray(message.content)) {
            const textParts = message.content
                .filter((block) => block.type === 'text')
                .map((block) => (block.type === 'text' ? block.text : ''))

            const hasImage = message.content.some((block) => block.type === 'image')

            return textParts.join('\n') + (hasImage ? '\n[Image attached]' : '')
        }

        return '[Complex message]'
    }

    /**
     * Sanitize messages for logging - replace base64 data with placeholders and truncate long content
     * Returns a simplified structure for logging purposes only (not for API calls)
     */
    private sanitizeMessagesForLogging(messages: MessageParam[]): unknown[] {
        const MAX_CONTENT_LENGTH = 500 // Show first 500 chars of tool results

        return messages.map(message => {
            if (typeof message.content === 'string') {
                return message
            }

            if (Array.isArray(message.content)) {
                const sanitizedContent = message.content.map(block => {
                    // Sanitize base64 images
                    if (block.type === 'image' && 'source' in block) {
                        return {
                            type: 'image',
                            source: '[BASE64_IMAGE_DATA]',
                        }
                    }

                    // Truncate long tool results
                    if (block.type === 'tool_result' && 'content' in block) {
                        const content = (block as { content: unknown }).content
                        if (typeof content === 'string' && content.length > MAX_CONTENT_LENGTH) {
                            return {
                                ...block,
                                content: `${content.slice(0, MAX_CONTENT_LENGTH)}...\n\n[TRUNCATED - Original length: ${content.length} chars]`,
                            }
                        }
                    }

                    return block
                })
                return { ...message, content: sanitizedContent }
            }

            return message
        })
    }
}

// Singleton instance
export const devLogger = new DevLogger()
