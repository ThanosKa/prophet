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

export const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign out and sign in again.'

export const INTERNAL_ERROR_MESSAGE = 'Something went wrong on our side. Please try again in a moment.'
