import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

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
      messages: {
        findMany: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/ratelimit', () => ({
  checkRateLimit: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Import after mocks
const { auth } = await import('@clerk/nextjs/server')
const { db } = await import('@/lib/db')
const { checkRateLimit } = await import('@/lib/ratelimit')

describe('GET /api/chats/[chatId]/messages', () => {
  const chatId = '550e8400-e29b-41d4-a716-446655440000'
  const userId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId } as any)
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
    vi.mocked(db.query.chats.findFirst).mockResolvedValue({ id: chatId, userId } as any)
  })

  it('returns paginated messages with default limit', async () => {
    const mockMessages = Array.from({ length: 5 }, (_, i) => ({
      id: `msg_${i}`,
      chatId,
      content: `Message ${i}`,
      createdAt: new Date(Date.now() - i * 1000),
      role: 'user',
    }))

    vi.mocked(db.query.messages.findMany).mockResolvedValue(mockMessages as any)

    const request = new Request(`http://localhost:3000/api/chats/${chatId}/messages`)
    const response = await GET(request, { params: Promise.resolve({ chatId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.messages).toHaveLength(5)
    expect(data.data.hasMore).toBe(false)
    expect(data.data.nextCursor).toBe(null)
    // Messages should be reversed (chronological order)
    expect(data.data.messages[0].id).toBe('msg_4')
    expect(data.data.messages[4].id).toBe('msg_0')
  })

  it('respects the limit parameter', async () => {
    const limit = 2
    const mockMessages = Array.from({ length: limit + 1 }, (_, i) => ({
      id: `msg_${i}`,
      chatId,
      content: `Message ${i}`,
      createdAt: new Date(Date.now() - i * 1000),
      role: 'user',
    }))

    vi.mocked(db.query.messages.findMany).mockResolvedValue(mockMessages as any)

    const request = new Request(`http://localhost:3000/api/chats/${chatId}/messages?limit=${limit}`)
    const response = await GET(request, { params: Promise.resolve({ chatId }) })
    const data = await response.json()

    expect(data.data.messages).toHaveLength(limit)
    expect(data.data.hasMore).toBe(true)
    expect(data.data.nextCursor).toEqual({
      beforeCreatedAt: mockMessages[limit - 1].createdAt.toISOString()
    })
  })

  it('filters by beforeCreatedAt parameter', async () => {
    const beforeDate = new Date().toISOString()
    vi.mocked(db.query.messages.findMany).mockResolvedValue([])

    const request = new Request(`http://localhost:3000/api/chats/${chatId}/messages?beforeCreatedAt=${beforeDate}`)
    await GET(request, { params: Promise.resolve({ chatId }) })

    expect(db.query.messages.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.anything(), // drizzle-orm objects are hard to match exactly here
      limit: 51,
      orderBy: expect.anything(),
    }))
  })

  it('returns 404 if chat is not found', async () => {
    vi.mocked(db.query.chats.findFirst).mockResolvedValue(null as any)

    const request = new Request(`http://localhost:3000/api/chats/${chatId}/messages`)
    const response = await GET(request, { params: Promise.resolve({ chatId }) })
    
    expect(response.status).toBe(404)
  })

  it('returns 401 if unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const request = new Request(`http://localhost:3000/api/chats/${chatId}/messages`)
    const response = await GET(request, { params: Promise.resolve({ chatId }) })
    
    expect(response.status).toBe(401)
  })
})


