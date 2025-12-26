import type { Message } from '@anthropic-ai/sdk'

// Anthropic streaming types
export interface StreamingMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatStreamRequest {
  chatId: string
  content: string
}

export interface ChatStreamResponse {
  type: 'token' | 'done' | 'error'
  content?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

// API Response helpers
export interface SuccessResponse<T = unknown> {
  data: T
}

export interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse

// Helper to create success responses
export function success<T>(data: T): SuccessResponse<T> {
  return { data }
}

// Helper to create error responses
export function error(message: string, code?: string, details?: unknown): ErrorResponse {
  return { error: message, code, details }
}

// Clerk webhook types
export interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted'
  data: {
    id: string
    email_addresses: Array<{ email_address: string }>
    public_metadata?: {
      tier?: 'free' | 'pro' | 'premium' | 'ultra'
    }
  }
}
