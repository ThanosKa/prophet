// Shared type definitions
// Add types here as the project grows

export type Tier = 'free' | 'pro' | 'premium' | 'ultra'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'

export interface User {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  profileImageUrl?: string | null
  tier: Tier
  creditsRemaining: number
  creditsIncluded: number
  billingPeriodStart?: Date | null
  billingPeriodEnd?: Date | null
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  stripePriceId?: string | null
  subscriptionStatus?: SubscriptionStatus | null
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
  model?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  costCents?: number | null
  createdAt: Date
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  code?: string
}

// Streaming types
export interface StreamEvent {
  type: 'token' | 'done' | 'error'
  content?: string
  error?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
}

export interface StreamChunk {
  event: StreamEvent
  timestamp: number
}

// Pagination types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalPages: number
    totalItems: number
  }
}

// Error types
export interface ApiError {
  error: string
  code: string
  details?: unknown
}
