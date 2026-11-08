import { afterEach, describe, expect, it, vi } from 'vitest'

const logger = vi.hoisted(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }))
const keepRequestOpenUntil = vi.hoisted(() => vi.fn())

vi.mock('@/lib/logger', () => ({ logger }))
vi.mock('@/lib/db/request-scope', () => ({ keepRequestOpenUntil }))
vi.mock('@/lib/cache', () => ({ getUserTier: vi.fn(async () => 'free') }))

async function loadRateLimit(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  return import('./ratelimit')
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
  vi.doUnmock('@upstash/ratelimit')
})

describe('rate limiting without Upstash', () => {
  it('logs an error in production, because every Turn is then unlimited', async () => {
    await loadRateLimit({ NODE_ENV: 'production', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' })

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Rate limiting is disabled'))
  })

  it('only warns in development, where Upstash is optional', async () => {
    await loadRateLimit({ NODE_ENV: 'development', UPSTASH_REDIS_REST_URL: '', UPSTASH_REDIS_REST_TOKEN: '' })

    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Rate limiting is disabled'))
  })

  it('still lets requests through, as the coding standards require', async () => {
    const { checkRateLimit } = await loadRateLimit({
      NODE_ENV: 'production',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
    })

    await expect(checkRateLimit('user_1', 'chat')).resolves.toEqual({ success: true })
  })
})

describe('rate limiting with Upstash', () => {
  it('keeps the request alive until the limiter has written its analytics', async () => {
    const analyticsWritten = Promise.resolve()
    vi.doMock('@upstash/ratelimit', () => {
      class Ratelimit {
        static slidingWindow() {
          return {}
        }
        async limit() {
          return { success: true, limit: 60, remaining: 59, reset: 0, pending: analyticsWritten }
        }
      }
      return { Ratelimit }
    })
    const { checkRateLimit } = await loadRateLimit({
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    })

    await checkRateLimit('user_1', 'chat')

    // The global limiter and the user's tier limiter each write analytics.
    expect(keepRequestOpenUntil).toHaveBeenCalledTimes(2)
    expect(keepRequestOpenUntil).toHaveBeenCalledWith(analyticsWritten)
  })
})
