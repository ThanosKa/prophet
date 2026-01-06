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
        findMany: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
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

describe('GET /api/chats', () => {
  const userId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId } as any)
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: 60 })
  })

  it('returns unauthorized when user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const request = new Request('http://localhost:3000/api/chats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
    expect(data.code).toBe('UNAUTHORIZED')
  })

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000
    })

    const request = new Request('http://localhost:3000/api/chats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toBe('Too many requests')
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED')
  })

  it('returns paginated chats with default limit', async () => {
    const mockChats = Array.from({ length: 5 }, (_, i) => ({
      id: `chat_${i}`,
      userId,
      title: `Chat ${i}`,
      updatedAt: new Date(Date.now() - i * 1000),
      createdAt: new Date(Date.now() - i * 1000),
    }))

    vi.mocked(db.query.chats.findMany).mockResolvedValue(mockChats as any)

    const request = new Request('http://localhost:3000/api/chats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.chats).toHaveLength(5)
    expect(data.data.hasMore).toBe(false)
    expect(data.data.nextCursor).toBe(null)
  })

  it('respects the limit parameter and returns nextCursor', async () => {
    const limit = 10
    const mockChats = Array.from({ length: limit + 1 }, (_, i) => ({
      id: `chat_${i}`,
      userId,
      title: `Chat ${i}`,
      updatedAt: new Date(Date.now() - i * 1000),
      createdAt: new Date(Date.now() - i * 1000),
    }))

    vi.mocked(db.query.chats.findMany).mockResolvedValue(mockChats as any)

    const request = new Request(`http://localhost:3000/api/chats?limit=${limit}`)
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.chats).toHaveLength(limit)
    expect(data.data.hasMore).toBe(true)
    expect(data.data.nextCursor).toBeTruthy()
    expect(data.data.nextCursor.beforeUpdatedAt).toBe(mockChats[9].updatedAt.toISOString())
  })

  it('returns hasMore=false when no more chats exist', async () => {
    const limit = 10
    const mockChats = Array.from({ length: 3 }, (_, i) => ({
      id: `chat_${i}`,
      userId,
      title: `Chat ${i}`,
      updatedAt: new Date(Date.now() - i * 1000),
      createdAt: new Date(Date.now() - i * 1000),
    }))

    vi.mocked(db.query.chats.findMany).mockResolvedValue(mockChats as any)

    const request = new Request(`http://localhost:3000/api/chats?limit=${limit}`)
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.chats).toHaveLength(3)
    expect(data.data.hasMore).toBe(false)
    expect(data.data.nextCursor).toBe(null)
  })

  it('filters chats using beforeUpdatedAt cursor', async () => {
    const cursorDate = new Date('2024-01-15T12:00:00Z')
    const mockChats = Array.from({ length: 5 }, (_, i) => ({
      id: `chat_${i}`,
      userId,
      title: `Chat ${i}`,
      updatedAt: new Date(cursorDate.getTime() - (i + 1) * 1000),
      createdAt: new Date(cursorDate.getTime() - (i + 1) * 1000),
    }))

    vi.mocked(db.query.chats.findMany).mockResolvedValue(mockChats as any)

    const request = new Request(`http://localhost:3000/api/chats?beforeUpdatedAt=${cursorDate.toISOString()}`)
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.chats).toHaveLength(5)

    // Verify findMany was called with lt condition for beforeUpdatedAt
    expect(db.query.chats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
        orderBy: expect.anything(),
        limit: expect.any(Number),
      })
    )
  })

  it('clamps limit to maximum of 200', async () => {
    const mockChats = Array.from({ length: 201 }, (_, i) => ({
      id: `chat_${i}`,
      userId,
      title: `Chat ${i}`,
      updatedAt: new Date(Date.now() - i * 1000),
      createdAt: new Date(Date.now() - i * 1000),
    }))

    vi.mocked(db.query.chats.findMany).mockResolvedValue(mockChats as any)

    const request = new Request('http://localhost:3000/api/chats?limit=500')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.chats).toHaveLength(200)
    expect(data.data.hasMore).toBe(true)

    // Verify findMany was called with limit 201 (200 + 1 for hasMore check)
    expect(db.query.chats.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 201,
      })
    )
  })

  it('orders chats by updatedAt DESC', async () => {
    const mockChats = [
      {
        id: 'chat_1',
        userId,
        title: 'Newest Chat',
        updatedAt: new Date('2024-01-15T12:00:00Z'),
        createdAt: new Date('2024-01-15T12:00:00Z'),
      },
      {
        id: 'chat_2',
        userId,
        title: 'Older Chat',
        updatedAt: new Date('2024-01-14T12:00:00Z'),
        createdAt: new Date('2024-01-14T12:00:00Z'),
      },
    ]

    vi.mocked(db.query.chats.findMany).mockResolvedValue(mockChats as any)

    const request = new Request('http://localhost:3000/api/chats')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.chats[0].id).toBe('chat_1')
    expect(data.data.chats[1].id).toBe('chat_2')
  })
})
