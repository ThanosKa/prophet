// Shared type definitions
// Add types here as the project grows

export type Tier = 'free' | 'pro' | 'premium' | 'ultra'

export interface User {
  id: string
  email: string
  tier: Tier
  creditsRemaining: number
  createdAt: Date
  updatedAt: Date
}

export interface Chat {
  id: string
  userId: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string
  inputTokens?: number
  outputTokens?: number
  createdAt: Date
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  code?: string
}
