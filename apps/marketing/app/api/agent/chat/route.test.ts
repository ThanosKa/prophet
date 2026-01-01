import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      chats: {
        findFirst: vi.fn(),
      },
      users: {
        findFirst: vi.fn(),
      },
      messages: {
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
    transaction: vi.fn((callback) => callback({
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    })),
  },
}))

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn(),
}))

vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      stream: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import after mocks
const { auth } = await import('@clerk/nextjs/server')
const { db } = await import('@/lib/db')
const { checkRateLimit } = await import('@/lib/ratelimit')
const { anthropic } = await import('@/lib/anthropic')

describe('POST /api/agent/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('rejects access to chats owned by other users', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user2', // Different user!
        title: 'Chat',
        contextTokens: 0,
        contextInputTokens: 0,
        contextOutputTokens: 0,
        contextReasoningTokens: 0,
        contextCachedInputTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Forbidden')
    })
  })

  describe('Rate Limiting', () => {
    it('enforces rate limits per user', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: 60,
      })

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('Too many requests')
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  describe('Request Validation', () => {
    it('validates chatId is a valid UUID', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: 'not-a-uuid',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid request body')
    })

    it('accepts initial request with userMessage', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user1',
        title: 'Chat',
        contextTokens: 0,
        contextInputTokens: 0,
        contextOutputTokens: 0,
        contextReasoningTokens: 0,
        contextCachedInputTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user1',
        email: 'test@example.com',
        creditsRemaining: 1000,
      } as any)
      vi.mocked(db.query.messages.findMany).mockResolvedValue([])

      // Mock streaming response
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_start', message: { usage: { input_tokens: 10 } } }
          yield { type: 'content_block_start', index: 0, content_block: { type: 'text' } }
          yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } }
          yield { type: 'content_block_stop', index: 0 }
          yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } }
        },
        finalMessage: vi.fn(() => Promise.resolve({ stop_reason: 'end_turn' })),
      }
      vi.mocked(anthropic.messages.stream).mockResolvedValue(mockStream as any)

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('accepts continuation with toolResults + previousContent', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user1',
        title: 'Chat',
        contextTokens: 0,
        contextInputTokens: 0,
        contextOutputTokens: 0,
        contextReasoningTokens: 0,
        contextCachedInputTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user1',
        email: 'test@example.com',
        creditsRemaining: 1000,
      } as any)
      vi.mocked(db.query.messages.findMany).mockResolvedValue([])

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_start', message: { usage: { input_tokens: 10 } } }
          yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } }
        },
        finalMessage: vi.fn(() => Promise.resolve({ stop_reason: 'end_turn' })),
      }
      vi.mocked(anthropic.messages.stream).mockResolvedValue(mockStream as any)

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          toolResults: [
            {
              type: 'tool_result',
              tool_use_id: 'tool_123',
              content: 'Success',
            },
          ],
          previousContent: [
            {
              type: 'text',
              text: 'Previous response',
            },
          ],
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('rejects request with neither userMessage nor toolResults', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user1',
        title: 'Chat',
        contextTokens: 0,
        contextInputTokens: 0,
        contextOutputTokens: 0,
        contextReasoningTokens: 0,
        contextCachedInputTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user1',
        email: 'test@example.com',
        creditsRemaining: 1000,
      } as any)
      vi.mocked(db.query.messages.findMany).mockResolvedValue([])

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          // Neither userMessage nor toolResults
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Either userMessage or toolResults is required')
    })
  })

  describe('Credits System', () => {
    it('rejects requests when user has insufficient credits (<10)', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user1',
        title: 'Chat',
        contextTokens: 0,
        contextInputTokens: 0,
        contextOutputTokens: 0,
        contextReasoningTokens: 0,
        contextCachedInputTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user1',
        email: 'test@example.com',
        creditsRemaining: 5, // Less than 10!
      } as any)

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error).toContain('Insufficient balance')
    })

    it('accepts request when user has exactly 10 credits', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user1',
        title: 'Chat',
        contextTokens: 0,
        contextInputTokens: 0,
        contextOutputTokens: 0,
        contextReasoningTokens: 0,
        contextCachedInputTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user1',
        email: 'test@example.com',
        creditsRemaining: 10, // Exactly 10
      } as any)
      vi.mocked(db.query.messages.findMany).mockResolvedValue([])

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_start', message: { usage: { input_tokens: 10 } } }
          yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } }
        },
        finalMessage: vi.fn(() => Promise.resolve({ stop_reason: 'end_turn' })),
      }
      vi.mocked(anthropic.messages.stream).mockResolvedValue(mockStream as any)

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Chat Not Found', () => {
    it('returns 404 when chat does not exist', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue(undefined)

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('Chat not found')
    })
  })

  describe('User Not Found', () => {
    it('returns 404 when user does not exist', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: 'user1' } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user1',
        title: 'Chat',
        contextTokens: 0,
        contextInputTokens: 0,
        contextOutputTokens: 0,
        contextReasoningTokens: 0,
        contextCachedInputTokens: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined)

      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          userMessage: 'Hello',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toContain('User not found')
    })
  })
})
