import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock modules
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      usageRecords: {
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
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

describe('GET /api/usage', () => {
  const userId = 'user_123'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(auth).mockResolvedValue({ userId } as any)
  })

  it('returns usage records for the authenticated user', async () => {
    const mockRecords = [
      { id: '1', model: 'claude-sonnet', inputTokens: 100, outputTokens: 50, costCents: 10, createdAt: new Date() },
    ]
    vi.mocked(db.query.usageRecords.findMany).mockResolvedValue(mockRecords as any)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1 }])
      })
    } as any)

    const request = new Request('http://localhost:3000/api/usage')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.records).toHaveLength(1)
    expect(data.data.pagination.total).toBe(1)
  })

  it('returns 401 if unauthorized', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any)

    const request = new Request('http://localhost:3000/api/usage')
    const response = await GET(request)
    
    expect(response.status).toBe(401)
  })
})

