import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      chats: {
        findFirst: vi.fn(),
      },
      messages: {
        findMany: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
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
      create: vi.fn(),
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

const { auth } = await import('@clerk/nextjs/server')
const { db } = await import('@/lib/db')
const { checkRateLimit } = await import('@/lib/ratelimit')
const { anthropic } = await import('@/lib/anthropic')

describe('POST /api/chats/[chatId]/title/auto', () => {
  const mockChatId = '550e8400-e29b-41d4-a716-446655440000'
  const mockUserId = 'user-1'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      const responseData = await response.json()

      expect(response.status).toBe(401)
      expect(responseData.error).toContain('Unauthorized')
    })

    it('returns 404 for non-existent chat', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue(undefined)

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toContain('Chat not found')
    })
  })

  describe('Rate Limiting', () => {
    it('enforces rate limits', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: 60,
      })

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      const responseData = await response.json()

      expect(response.status).toBe(429)
      expect(responseData.error).toContain('Too many requests')
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  describe('Default title guard', () => {
    it('skips auto-title if chat title is already customized', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: mockChatId,
        userId: mockUserId,
        title: 'Custom Title',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data?.title).toBe('Custom Title')
      expect(vi.mocked(anthropic.messages.create)).not.toHaveBeenCalled()
    })

    it('skips auto-title if insufficient messages', async () => {
      vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: mockChatId,
        userId: mockUserId,
        title: 'New Chat 10:00:00 AM',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(db.query.messages.findMany).mockResolvedValue([])

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data?.title).toBe('New Chat 10:00:00 AM')
      expect(vi.mocked(anthropic.messages.create)).not.toHaveBeenCalled()
    })
  })

  describe('Happy path: title generation', () => {
    it('generates and saves a new title for default-titled chats', async () => {
      const now = new Date()
      vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: mockChatId,
        userId: mockUserId,
        title: 'New Chat 10:00:00 AM',
        createdAt: now,
        updatedAt: now,
      })
      vi.mocked(db.query.messages.findMany).mockResolvedValue([
        {
          id: 'msg-1',
          chatId: mockChatId,
          role: 'user' as const,
          content: 'What is the weather like?',
          model: null,
          inputTokens: null,
          outputTokens: null,
          costCents: null,
          toolCalls: null,
          createdAt: now,
        },
        {
          id: 'msg-2',
          chatId: mockChatId,
          role: 'assistant' as const,
          content: 'The weather is sunny.',
          model: 'claude-haiku-4-5',
          inputTokens: 10,
          outputTokens: 5,
          costCents: 1,
          toolCalls: null,
          createdAt: new Date(now.getTime() + 1000),
        },
      ])

      vi.mocked(anthropic.messages.create).mockResolvedValue({
        content: [{ type: 'text', text: 'Weather Check' }],
      } as any)

      const mockUpdate = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      }))
      const mockSet = vi.fn(() => mockUpdate())
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as any)

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.data?.title).toBe('Weather Check')
      expect(vi.mocked(anthropic.messages.create)).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-haiku-4-5',
          max_tokens: 50,
        })
      )
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Weather Check',
          updatedAt: expect.any(Date),
        })
      )
    })

    it('sanitizes generated titles (removes quotes, truncates)', async () => {
      const now = new Date()
      vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: mockChatId,
        userId: mockUserId,
        title: 'New Chat 10:00:00 AM',
        createdAt: now,
        updatedAt: now,
      })
      vi.mocked(db.query.messages.findMany).mockResolvedValue([
        {
          id: 'msg-1',
          chatId: mockChatId,
          role: 'user' as const,
          content: 'Hello',
          model: null,
          inputTokens: null,
          outputTokens: null,
          costCents: null,
          toolCalls: null,
          createdAt: now,
        },
        {
          id: 'msg-2',
          chatId: mockChatId,
          role: 'assistant' as const,
          content: 'Hi!',
          model: 'claude-haiku-4-5',
          inputTokens: 5,
          outputTokens: 2,
          costCents: 1,
          toolCalls: null,
          createdAt: new Date(now.getTime() + 1000),
        },
      ])

      vi.mocked(anthropic.messages.create).mockResolvedValue({
        content: [{ type: 'text', text: '"A very long title that should be truncated because it exceeds the maximum allowed length of one hundred characters"' }],
      } as any)

      const mockUpdate = vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      }))
      const mockSet = vi.fn(() => mockUpdate())
      vi.mocked(db.update).mockReturnValue({
        set: mockSet,
      } as any)

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      expect(response.status).toBe(200)

      expect(mockSet).toHaveBeenCalled()
      const calls = (mockSet as any).mock.calls
      const savedTitle = calls[0][0].title
      expect(savedTitle).toBeDefined()
      expect(savedTitle).not.toContain('"')
      expect(savedTitle.length).toBeLessThanOrEqual(100)
    })
  })

  describe('Error handling', () => {
    it('returns 500 on Anthropic API error', async () => {
      const now = new Date()
      vi.mocked(auth).mockResolvedValue({ userId: mockUserId } as any)
      vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
      vi.mocked(db.query.chats.findFirst).mockResolvedValue({
        id: mockChatId,
        userId: mockUserId,
        title: 'New Chat 10:00:00 AM',
        createdAt: now,
        updatedAt: now,
      })
      vi.mocked(db.query.messages.findMany).mockResolvedValue([
        {
          id: 'msg-1',
          chatId: mockChatId,
          role: 'user' as const,
          content: 'Hello',
          model: null,
          inputTokens: null,
          outputTokens: null,
          costCents: null,
          toolCalls: null,
          createdAt: now,
        },
        {
          id: 'msg-2',
          chatId: mockChatId,
          role: 'assistant' as const,
          content: 'Hi!',
          model: 'claude-haiku-4-5',
          inputTokens: 5,
          outputTokens: 2,
          costCents: 1,
          toolCalls: null,
          createdAt: new Date(now.getTime() + 1000),
        },
      ])

      vi.mocked(anthropic.messages.create).mockRejectedValue(new Error('API error'))

      const request = new Request(`http://localhost:3000/api/chats/${mockChatId}/title/auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request, { params: Promise.resolve({ chatId: mockChatId }) })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toContain('Internal server error')
    })
  })
})
