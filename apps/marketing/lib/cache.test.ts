import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock Redis methods
const mockGet = vi.fn()
const mockSetex = vi.fn()
const mockDel = vi.fn()

// Create mock Redis client to inject into functions
const mockRedis = {
  get: mockGet,
  setex: mockSetex,
  del: mockDel,
} as any

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Import after mocks are set up
const { db } = await import('@/lib/db')
const { logger } = await import('@/lib/logger')
const { getUserTier, invalidateUserTierCache, CACHE_TTL_SECONDS } = await import('./cache')

describe('User Tier Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserTier', () => {
    describe('cache hit scenarios', () => {
      it('returns cached tier when available in Redis', async () => {
        mockGet.mockResolvedValue('pro')

        const tier = await getUserTier('user_123', mockRedis)

        expect(tier).toBe('pro')
        expect(mockGet).toHaveBeenCalledWith('user:tier:user_123')
      })

      it('does not query database when cache hit', async () => {
        mockGet.mockResolvedValue('premium')

        await getUserTier('user_456', mockRedis)

        expect(db.query.users.findFirst).not.toHaveBeenCalled()
      })
    })

    describe('cache miss scenarios', () => {
      it('queries database on cache miss', async () => {
        mockGet.mockResolvedValue(null)
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          id: 'user_123',
          tier: 'pro',
        } as any)

        const tier = await getUserTier('user_123', mockRedis)

        expect(tier).toBe('pro')
        expect(db.query.users.findFirst).toHaveBeenCalledWith({
          where: expect.anything(),
          columns: { tier: true },
        })
      })

      it('caches tier in Redis after database query', async () => {
        mockGet.mockResolvedValue(null)
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          id: 'user_123',
          tier: 'premium',
        } as any)

        await getUserTier('user_123', mockRedis)

        expect(mockSetex).toHaveBeenCalledWith(
          'user:tier:user_123',
          CACHE_TTL_SECONDS,
          'premium'
        )
      })

      it('uses correct cache key format', async () => {
        mockGet.mockResolvedValue(null)
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          id: 'user_abc',
          tier: 'ultra',
        } as any)

        await getUserTier('user_abc', mockRedis)

        expect(mockGet).toHaveBeenCalledWith('user:tier:user_abc')
        expect(mockSetex).toHaveBeenCalledWith(
          'user:tier:user_abc',
          expect.any(Number),
          'ultra'
        )
      })
    })

    describe('fallback behavior', () => {
      it('returns "free" when user not found in database', async () => {
        mockGet.mockResolvedValue(null)
        vi.mocked(db.query.users.findFirst).mockResolvedValue(null as any)

        const tier = await getUserTier('nonexistent_user', mockRedis)

        expect(tier).toBe('free')
      })

      it('does not cache "free" tier for nonexistent users', async () => {
        mockGet.mockResolvedValue(null)
        vi.mocked(db.query.users.findFirst).mockResolvedValue(null as any)

        await getUserTier('nonexistent_user', mockRedis)

        expect(mockSetex).not.toHaveBeenCalled()
      })

      it('falls back to database when Redis get fails', async () => {
        mockGet.mockRejectedValue(new Error('Redis connection failed'))
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          id: 'user_123',
          tier: 'pro',
        } as any)

        const tier = await getUserTier('user_123', mockRedis)

        expect(tier).toBe('pro')
        expect(db.query.users.findFirst).toHaveBeenCalled()
        expect(logger.error).toHaveBeenCalled()
      })

      it('returns tier even when cache population fails', async () => {
        mockGet.mockResolvedValue(null)
        mockSetex.mockRejectedValue(new Error('Redis write failed'))
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          id: 'user_123',
          tier: 'premium',
        } as any)

        const tier = await getUserTier('user_123', mockRedis)

        expect(tier).toBe('premium')
        expect(logger.error).toHaveBeenCalled()
      })
    })

    describe('invalid cached value', () => {
      it('falls back to database when cached tier is invalid', async () => {
        mockGet.mockResolvedValue('invalid_tier')
        vi.mocked(db.query.users.findFirst).mockResolvedValue({
          id: 'user_123',
          tier: 'pro',
        } as any)

        const tier = await getUserTier('user_123', mockRedis)

        expect(tier).toBe('pro')
        expect(db.query.users.findFirst).toHaveBeenCalled()
      })
    })
  })

  describe('invalidateUserTierCache', () => {
    it('deletes the cache key for specified user', async () => {
      mockDel.mockResolvedValue(1)

      await invalidateUserTierCache('user_123', mockRedis)

      expect(mockDel).toHaveBeenCalledWith('user:tier:user_123')
    })

    it('handles Redis deletion errors gracefully', async () => {
      mockDel.mockRejectedValue(new Error('Redis error'))

      await expect(invalidateUserTierCache('user_123', mockRedis)).resolves.not.toThrow()
    })

    it('logs error when cache invalidation fails', async () => {
      mockDel.mockRejectedValue(new Error('Redis error'))

      await invalidateUserTierCache('user_123', mockRedis)

      expect(logger.error).toHaveBeenCalled()
    })

    it('logs success when cache invalidation succeeds', async () => {
      mockDel.mockResolvedValue(1)

      await invalidateUserTierCache('user_123', mockRedis)

      expect(logger.info).toHaveBeenCalled()
    })
  })

  describe('Cache TTL', () => {
    it('exports correct TTL constant (300 seconds)', () => {
      expect(CACHE_TTL_SECONDS).toBe(300)
    })

    it('uses 5 minute TTL when caching tier', async () => {
      mockGet.mockResolvedValue(null)
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user_123',
        tier: 'pro',
      } as any)

      await getUserTier('user_123', mockRedis)

      expect(mockSetex).toHaveBeenCalledWith(
        expect.any(String),
        300,
        expect.any(String)
      )
    })
  })

  describe('Type safety', () => {
    it('returns valid UserTier type for all valid tiers', async () => {
      const validTiers = ['free', 'pro', 'premium', 'ultra']

      for (const expectedTier of validTiers) {
        vi.clearAllMocks()
        mockGet.mockResolvedValue(expectedTier)
        const tier = await getUserTier('user_123', mockRedis)
        expect(validTiers).toContain(tier)
      }
    })
  })
})
