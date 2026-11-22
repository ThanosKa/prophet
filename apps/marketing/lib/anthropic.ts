import Anthropic from '@anthropic-ai/sdk'
import { CLAUDE_MODELS } from '@prophet/shared'

export { CLAUDE_MODELS }

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is not set')
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const DEFAULT_MODEL = CLAUDE_MODELS.HAIKU

export const DEFAULT_MAX_TOKENS = 4096

export const SYSTEM_PROMPT = `You are Prophet, a helpful AI assistant integrated into a Chrome extension.
You provide concise, accurate, and helpful responses to user questions.
You can help with a wide range of topics including coding, writing, analysis, and general knowledge.`
