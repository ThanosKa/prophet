/**
 * Dev Logger for LLM Interactions
 * 
 * Logs all LLM requests and responses to log.txt when NODE_ENV=development
 * Provides formatted output showing model, user messages, JSON payloads, and responses.
 */

import { writeFile, appendFile } from 'fs/promises'
import { join } from 'path'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

const LOG_FILE_PATH = join(process.cwd(), 'log.txt')

export class DevLogger {
    private isDev: boolean
    private buffer: string[] = []

    constructor() {
        this.isDev = process.env.NODE_ENV === 'development'
    }

    /**
     * Log an LLM request (before streaming)
     */
    async logRequest(model: string, messages: MessageParam[], systemPrompt?: string): Promise<void> {
        if (!this.isDev) return

        const timestamp = new Date().toISOString()

        // Extract user message
        const lastMessage = messages[messages.length - 1]
        const userMessage = this.extractTextFromMessage(lastMessage)

        // Format JSON sent to LLM
        const jsonSent = JSON.stringify(
            {
                model,
                system: systemPrompt,
                messages,
            },
            null,
            2
        )

        const logBlock = `
===================================================================================================
${timestamp}
MODEL: ${model}
===================================================================================================

USER MESSAGE:
${userMessage}

===================================================================================================
JSON RAW SENT TO LLM:
===================================================================================================
${jsonSent}

---------------------------------------------------------------------------------------------------
`

        this.buffer.push(logBlock)

        // Write immediately in case of crash
        try {
            await appendFile(LOG_FILE_PATH, logBlock, 'utf-8')
        } catch (err) {
            console.error('[DevLogger] Failed to write to log file:', err)
        }
    }

    /**
     * Log LLM response (after streaming completes)
     */
    async logResponse(responseText: string, usage?: { input_tokens: number; output_tokens: number }): Promise<void> {
        if (!this.isDev) return

        const responseBlock = `
RESPONSE FROM LLM:
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
        } catch (err) {
            console.error('[DevLogger] Failed to write response to log file:', err)
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
        } catch (err) {
            console.error('[DevLogger] Failed to write error to log file:', err)
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
        } catch (err) {
            console.error('[DevLogger] Failed to clear log file:', err)
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
                .map((block: any) => block.text)

            const hasImage = message.content.some((block) => block.type === 'image')

            return textParts.join('\n') + (hasImage ? '\n[Image attached]' : '')
        }

        return '[Complex message]'
    }
}

// Singleton instance
export const devLogger = new DevLogger()
