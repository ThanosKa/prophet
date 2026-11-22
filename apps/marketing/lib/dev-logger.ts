import { attemptAsync } from '@prophet/shared'
import { writeFile, appendFile, mkdir } from 'fs/promises'
import { join, resolve } from 'path'
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'
import { logger } from '@/lib/logger'

const LOG_DIR = resolve(process.cwd(), 'logs')
const LOG_FILE_PATH = join(LOG_DIR, 'response.txt')

export class DevLogger {
    private isDev: boolean
    private buffer: string[] = []

    constructor() {
        this.isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
        
        if (this.isDev) {
            logger.info({ logDir: LOG_DIR }, 'DevLogger initialized')
        }
    }

    private async ensureLogDir(): Promise<void> {
        await attemptAsync(() => mkdir(LOG_DIR, { recursive: true }))
    }

    async logRequest(
        model: string,
        messages: MessageParam[],
        systemPrompt?: string,
        options?: { enableThinking?: boolean; [key: string]: unknown }
    ): Promise<void> {
        if (!this.isDev) return

        await this.ensureLogDir()
        const timestamp = new Date().toISOString()

        const lastMessage = messages[messages.length - 1]
        const userMessage = this.extractTextFromMessage(lastMessage)

        const llmInput = messages.map(m => `[${m.role.toUpperCase()}]: ${this.extractTextFromMessage(m)}`).join('\n')

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

        try {
            await appendFile(LOG_FILE_PATH, logBlock, 'utf-8')
        } catch (_err) {
            logger.error({ error: _err instanceof Error ? _err.message : String(_err) }, 'DevLogger: Failed to write to log file')
        }
    }

    async logResponse(
        responseText: string,
        usage?: {
            input_tokens: number
            output_tokens: number
            cache_read_input_tokens?: number
            cache_creation_input_tokens?: number
        }
    ): Promise<void> {
        if (!this.isDev) return

        await this.ensureLogDir()

        const cacheInfo = usage?.cache_read_input_tokens || usage?.cache_creation_input_tokens
            ? `\n🎯 Cache Read: ${usage.cache_read_input_tokens || 0} tokens | Cache Creation: ${usage.cache_creation_input_tokens || 0} tokens`
            : ''

        const responseBlock = `
RESPONSE OF LLM
===================================================================================================

${responseText}

${usage ? `\nTokens: Input=${usage.input_tokens}, Output=${usage.output_tokens}${cacheInfo}` : ''}

===================================================================================================
END OF RESPONSE
===================================================================================================

`

        this.buffer.push(responseBlock)

        try {
            await appendFile(LOG_FILE_PATH, responseBlock, 'utf-8')
        } catch (_err) {
            logger.error({ error: _err instanceof Error ? _err.message : String(_err) }, 'DevLogger: Failed to write response to log file')
        }
    }

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
            logger.error({ error: _err instanceof Error ? _err.message : String(_err) }, 'DevLogger: Failed to write error to log file')
        }
    }

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
            logger.error({ error: _err instanceof Error ? _err.message : String(_err) }, 'DevLogger: Failed to clear log file')
        }
    }

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

    private sanitizeMessagesForLogging(messages: MessageParam[]): unknown[] {
        const MAX_CONTENT_LENGTH = 500

        return messages.map(message => {
            if (typeof message.content === 'string') {
                return message
            }

            if (Array.isArray(message.content)) {
                const sanitizedContent = message.content.map(block => {
                    if (block.type === 'image' && 'source' in block) {
                        return {
                            type: 'image',
                            source: '[BASE64_IMAGE_DATA]',
                        }
                    }

                    if (block.type === 'tool_result' && 'content' in block) {
                        const content = block.content
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

export const devLogger = new DevLogger()
