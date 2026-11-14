import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

const { authMock, checkRateLimitMock, findFirstMock, stripeCall } = vi.hoisted(() => ({
  authMock: vi.fn<() => Promise<{ userId: string | null }>>(),
  checkRateLimitMock: vi.fn<() => Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }>>(),
  findFirstMock: vi.fn(),
  stripeCall: vi.fn(),
}))

vi.mock('@clerk/nextjs/server', () => ({ auth: authMock }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: checkRateLimitMock }))
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/db', () => ({ db: { query: { users: { findFirst: findFirstMock } } } }))
vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: stripeCall } },
    billingPortal: { sessions: { create: stripeCall } },
  },
}))

const USER = { id: 'user_1', email: 'a@example.com', stripeCustomerId: 'cus_1' }
const call = () => POST(new Request('http://localhost:3000/api/stripe/portal', { method: 'POST' }))

describe('POST /api/stripe/portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({ userId: USER.id })
    checkRateLimitMock.mockResolvedValue({ success: true })
    findFirstMock.mockResolvedValue(USER)
    stripeCall.mockResolvedValue({ id: 'sess_1', url: 'https://stripe.test/session' })
  })

  it('answers 401 before any rate limit check when signed out', async () => {
    authMock.mockResolvedValue({ userId: null })
    const response = await call()
    expect(response.status).toBe(401)
    expect(checkRateLimitMock).not.toHaveBeenCalled()
  })

  it('answers 429 with rate limit headers and reaches neither the database nor Stripe', async () => {
    checkRateLimitMock.mockResolvedValue({ success: false, limit: 15, remaining: 0, reset: 1234 })
    const response = await call()
    expect(checkRateLimitMock).toHaveBeenCalledWith(USER.id, 'api')
    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
    })
    expect(response.headers.get('X-RateLimit-Limit')).toBe('15')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1234')
    expect(findFirstMock).not.toHaveBeenCalled()
    expect(stripeCall).not.toHaveBeenCalled()
  })

  it('still opens the billing portal when the limit is not reached', async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ url: 'https://stripe.test/session' })
    expect(stripeCall).toHaveBeenCalledOnce()
  })
})
