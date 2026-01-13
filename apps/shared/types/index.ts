// Shared type definitions
// Add types here as the project grows

export * from './agent'

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
  contextTokens: number
  contextInputTokens: number
  contextOutputTokens: number
  contextReasoningTokens: number
  contextCachedInputTokens: number
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  chatId: string
  role: 'user' | 'assistant'
  content: string
  thinkingContent?: string
  model?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  costCents?: number | null
  createdAt: Date
}

export interface UsageRecord {
  id: string
  userId: string
  inputTokens: number
  outputTokens: number
  costCents: number
  model: string
  createdAt: Date
}

export interface PaginatedMessages {
  messages: Message[]
  nextCursor?: { beforeCreatedAt: string } | null
  hasMore: boolean
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
