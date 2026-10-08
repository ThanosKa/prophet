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
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ creditsRemaining: 0 }])),
        })),
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

// The reserve/settle SQL has its own PGlite tests; here the route only needs a hold.
vi.mock('@/lib/credit-reservation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/credit-reservation')>()
  return {
    ...actual,
    reserveCredits: vi.fn(async ({ reserveCents }: { reserveCents: number }) => ({
      subscriptionCents: reserveCents,
      purchasedCents: 0,
    })),
    settleCredits: vi.fn(async () => {}),
  }
})

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn(),
}))

// The Run record has its own PGlite tests (route.run-record.test.ts); here the route
// only needs a started Run.
vi.mock('@/lib/agent/run-record', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/agent/run-record')>()
  return {
    ...actual,
    openRun: vi.fn(async () => ({ history: [], opening: { id: 'opening', createdAt: new Date() } })),
    writeRunRecord: vi.fn(async () => 'written'),
  }
})

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
const { reserveCredits } = await import('@/lib/credit-reservation')

describe('POST /api/agent/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests with a sign-in-again message', async () => {
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
      expect(data.code).toBe('UNAUTHORIZED')
      expect(data.error).toBe('Your session has expired. Please sign out and sign in again.')
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
        purchasedCredits: 0,
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
        purchasedCredits: 0,
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
        purchasedCredits: 0,
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
    it('answers 409 BALANCE_HELD with Retry-After when the atomic reserve loses a race for the balance', async () => {
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
        purchasedCredits: 0, // read before a parallel request drained it
      } as any)
      vi.mocked(db.query.messages.findMany).mockResolvedValue([])
      vi.mocked(reserveCredits).mockResolvedValueOnce(null)

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

      expect(response.status).toBe(409)
      expect(response.headers.get('Retry-After')).toBe('5')
      expect(data).toEqual({
        error: "Some of your balance is held by another request that's still running. Try again in a few seconds.",
        code: 'BALANCE_HELD',
        details: { retryAfter: 5 },
      })
      expect(anthropic.messages.stream).not.toHaveBeenCalled()
    })

    it('rejects requests when the balance cannot cover the smallest allowed turn', async () => {
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
        creditsRemaining: 0,
        purchasedCredits: 0, // even the cheapest Haiku turn costs 1
      } as any)
      vi.mocked(db.query.messages.findMany).mockResolvedValue([])

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
      expect(data.code).toBe('INSUFFICIENT_BALANCE')
      expect(data.error).toBe("You're out of credits. Buy more credits or upgrade your plan to keep going.")
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
        creditsRemaining: 10,
        purchasedCredits: 0, // Exactly 10
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

  describe('Message History Format', () => {
    it('should not have consecutive assistant messages on continuation turns', async () => {
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
        purchasedCredits: 0,
      } as any)

      // Simulate DB having user message + assistant message from previous turn
      vi.mocked(db.query.messages.findMany).mockResolvedValue([
        {
          id: 'msg1',
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'user',
          content: 'Original user message',
          createdAt: new Date(),
        },
        {
          id: 'msg2',
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'assistant',
          content: 'Previous assistant response',
          createdAt: new Date(),
        },
      ] as any)

      let capturedMessages: any[] = []
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { type: 'message_start', message: { usage: { input_tokens: 10 } } }
          yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } }
        },
        finalMessage: vi.fn(() => Promise.resolve({
          stop_reason: 'end_turn',
          usage: { cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        })),
      }
      vi.mocked(anthropic.messages.stream).mockImplementation((params: any) => {
        capturedMessages = params.messages
        return mockStream as any
      })

      // Continuation turn: toolResults + previousContent
      const request = new Request('http://localhost:3000/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '550e8400-e29b-41d4-a716-446655440000',
          toolResults: [
            {
              type: 'tool_result',
              tool_use_id: 'tool_123',
              content: 'Tool executed successfully',
            },
          ],
          previousContent: [
            { type: 'text', text: 'Let me use a tool' },
            { type: 'tool_use', id: 'tool_123', name: 'take_snapshot', input: {} },
          ],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify message format: should NOT have consecutive assistant messages
      // Expected: [user (from DB), assistant (from previousContent), user (tool_result)]
      // The fix removes the duplicate assistant from DB loading
      for (let i = 1; i < capturedMessages.length; i++) {
        const prevRole = capturedMessages[i - 1].role
        const currRole = capturedMessages[i].role
        expect(currRole).not.toBe(prevRole)
      }
    })
  })
})
