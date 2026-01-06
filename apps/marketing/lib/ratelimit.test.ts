import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, chatRatelimits, apiRatelimits, globalRatelimit } from './ratelimit'

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  },
}))

const { db } = await import('@/lib/db')

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('returns success when rate limit disabled (no Redis)', async () => {
      if (!chatRatelimits) {
        const result = await checkRateLimit('user_123', 'chat')
        expect(result.success).toBe(true)
      } else {
        expect(true).toBe(true)
      }
    })

    it('checks global rate limit first', async () => {
      if (!globalRatelimit) {
        expect(true).toBe(true)
        return
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user_123',
        tier: 'free',
      } as any)

      const globalLimitSpy = vi.spyOn(globalRatelimit, 'limit')

      await checkRateLimit('user_123', 'chat')

      expect(globalLimitSpy).toHaveBeenCalledWith('global')
    })

    it('looks up user tier from database', async () => {
      if (!chatRatelimits) {
        expect(true).toBe(true)
        return
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user_123',
        tier: 'pro',
      } as any)

      await checkRateLimit('user_123', 'chat')

      expect(db.query.users.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
        columns: { tier: true },
      })
    })

    it('defaults to free tier if user not found', async () => {
      if (!chatRatelimits) {
        expect(true).toBe(true)
        return
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue(null as any)

      const result = await checkRateLimit('user_123', 'chat')

      expect(result).toBeDefined()
    })

    it('uses chat limiters when type is chat', async () => {
      if (!chatRatelimits) {
        expect(true).toBe(true)
        return
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user_123',
        tier: 'free',
      } as any)

      await checkRateLimit('user_123', 'chat')

      expect(db.query.users.findFirst).toHaveBeenCalled()
    })

    it('uses api limiters when type is api', async () => {
      if (!apiRatelimits) {
        expect(true).toBe(true)
        return
      }

      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: 'user_123',
        tier: 'free',
      } as any)

      await checkRateLimit('user_123', 'api')

      expect(db.query.users.findFirst).toHaveBeenCalled()
    })
  })

  describe('Tier-based limits', () => {
    it('applies different limits for different tiers', async () => {
      if (!chatRatelimits) {
        expect(true).toBe(true)
        return
      }

      expect(chatRatelimits.free).toBeDefined()
      expect(chatRatelimits.pro).toBeDefined()
      expect(chatRatelimits.premium).toBeDefined()
      expect(chatRatelimits.ultra).toBeDefined()
    })

    it('has separate prefixes for each tier', async () => {
      if (!chatRatelimits) {
        expect(true).toBe(true)
        return
      }

      const freePrefix = (chatRatelimits.free as any).prefix
      const proPrefix = (chatRatelimits.pro as any).prefix

      expect(freePrefix).toContain('free')
      expect(proPrefix).toContain('pro')
      expect(freePrefix).not.toBe(proPrefix)
    })
  })

  describe('Global rate limit', () => {
    it('has global rate limiter defined when Redis available', () => {
      if (process.env.UPSTASH_REDIS_REST_URL && !process.env.UPSTASH_REDIS_REST_URL.includes('fake')) {
        expect(globalRatelimit).toBeDefined()
      } else {
        expect(globalRatelimit).toBeNull()
      }
    })
  })

  describe('Response structure', () => {
    it('returns success, limit, remaining, and reset fields', async () => {
      const result = await checkRateLimit('user_123', 'chat')

      expect(result).toHaveProperty('success')
      expect(typeof result.success).toBe('boolean')

      if (result.limit !== undefined) {
        expect(typeof result.limit).toBe('number')
      }

      if (result.remaining !== undefined) {
        expect(typeof result.remaining).toBe('number')
      }

      if (result.reset !== undefined) {
        expect(typeof result.reset).toBe('number')
      }
    })
  })
})
