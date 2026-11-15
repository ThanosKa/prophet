import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: vi.fn() }))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      usageRecords: {
        findMany: vi.fn(),
      },
    },
  },
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

describe('GET /api/usage/export', () => {
  const userId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId } as any)
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true })
  })

  it('returns CSV for usage records', async () => {
    const mockRecords = [
      { id: '1', model: 'claude-sonnet', inputTokens: 100, outputTokens: 50, costCents: 10, createdAt: new Date('2024-01-01') },
    ]
    vi.mocked(db.query.usageRecords.findMany).mockResolvedValue(mockRecords as any)

    const request = new Request('http://localhost:3000/api/usage/export')
    const response = await GET(request)
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    expect(text).toContain('Date,Model,Input Tokens,Output Tokens')
    expect(text).toContain('claude-sonnet')
    expect(text).toContain('"100"')
    expect(text).toContain('"50"')
  })

  it('returns 401 if unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const request = new Request('http://localhost:3000/api/usage/export')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
  })

  it('answers 401 before any rate limit check when signed out', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)
    const response = await GET(new Request('http://localhost:3000/api/usage/export'))
    expect(response.status).toBe(401)
    expect(checkRateLimit).not.toHaveBeenCalled()
  })

  it('answers 429 with rate limit headers and does not read the database', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, limit: 15, remaining: 0, reset: 1234 })
    const response = await GET(new Request('http://localhost:3000/api/usage/export'))
    expect(checkRateLimit).toHaveBeenCalledWith(userId, 'api')
    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' })
    expect(response.headers.get('X-RateLimit-Limit')).toBe('15')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1234')
    expect(db.query.usageRecords.findMany).not.toHaveBeenCalled()
  })
})

