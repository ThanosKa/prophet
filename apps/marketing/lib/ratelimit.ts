import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getUserTier } from '@/lib/cache'

const isFakeCredentials =
  process.env.UPSTASH_REDIS_REST_URL?.includes('fake') ||
  process.env.UPSTASH_REDIS_REST_TOKEN === 'faketoken123'

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. Rate limiting will be disabled.')
} else if (isFakeCredentials) {
  console.warn('Fake Upstash credentials detected. Rate limiting will be disabled.')
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  !isFakeCredentials
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

const chatLimits = {
  free: { requests: 5, window: '1 m' },
  pro: { requests: 20, window: '1 m' },
  premium: { requests: 60, window: '1 m' },
  ultra: { requests: 60, window: '1 m' },
} as const

const apiLimits = {
  free: { requests: 15, window: '1 m' },
  pro: { requests: 60, window: '1 m' },
  premium: { requests: 120, window: '1 m' },
  ultra: { requests: 120, window: '1 m' },
} as const

export const chatRatelimits = redis
  ? {
      free: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(chatLimits.free.requests, chatLimits.free.window),
        analytics: true,
        prefix: 'ratelimit:chat:free',
      }),
      pro: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(chatLimits.pro.requests, chatLimits.pro.window),
        analytics: true,
        prefix: 'ratelimit:chat:pro',
      }),
      premium: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(chatLimits.premium.requests, chatLimits.premium.window),
        analytics: true,
        prefix: 'ratelimit:chat:premium',
      }),
      ultra: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(chatLimits.ultra.requests, chatLimits.ultra.window),
        analytics: true,
        prefix: 'ratelimit:chat:ultra',
      }),
    }
  : null

export const apiRatelimits = redis
  ? {
      free: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(apiLimits.free.requests, apiLimits.free.window),
        analytics: true,
        prefix: 'ratelimit:api:free',
      }),
      pro: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(apiLimits.pro.requests, apiLimits.pro.window),
        analytics: true,
        prefix: 'ratelimit:api:pro',
      }),
      premium: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(apiLimits.premium.requests, apiLimits.premium.window),
        analytics: true,
        prefix: 'ratelimit:api:premium',
      }),
      ultra: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(apiLimits.ultra.requests, apiLimits.ultra.window),
        analytics: true,
        prefix: 'ratelimit:api:ultra',
      }),
    }
  : null

export const globalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(500, '1 m'),
      analytics: true,
      prefix: 'ratelimit:global',
    })
  : null

export async function checkRateLimit(
  userId: string,
  type: 'chat' | 'api' = 'api'
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  if (globalRatelimit) {
    const globalCheck = await globalRatelimit.limit('global')
    if (!globalCheck.success) {
      return { success: false, limit: globalCheck.limit, remaining: globalCheck.remaining, reset: globalCheck.reset }
    }
  }

  const limiters = type === 'chat' ? chatRatelimits : apiRatelimits

  if (!limiters) {
    return { success: true }
  }

  const tier = await getUserTier(userId)
  const limiter = limiters[tier]

  const { success, limit, remaining, reset } = await limiter.limit(userId)

  return { success, limit, remaining, reset }
}
