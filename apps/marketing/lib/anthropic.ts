import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODELS } from '@prophet/shared'

export { CLAUDE_MODELS }

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is not set')
}

/**
 * Anthropic SDK client instance
 * Uses Claude Haiku for optimal balance of speed and quality
 */
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Default model for chat completions
 * Claude Haiku 4.5 - Fast and efficient for most tasks
 */
export const DEFAULT_MODEL = CLAUDE_MODELS.HAIKU

/**
 * Default max tokens for responses
 * Balances quality and cost
 */
export const DEFAULT_MAX_TOKENS = 4096

/**
 * System prompt for the AI assistant
 */
export const SYSTEM_PROMPT = `You are Prophet, a helpful AI assistant integrated into a Chrome extension.
You provide concise, accurate, and helpful responses to user questions.
You can help with a wide range of topics including coding, writing, analysis, and general knowledge.`
