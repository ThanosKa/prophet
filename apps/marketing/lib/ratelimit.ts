import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

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

/**
 * Rate limiter for chat streaming endpoint
 * Limits: 10 requests per 1 minute per user
 */
export const chatRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:chat',
    })
  : null

/**
 * Rate limiter for general API endpoints
 * Limits: 30 requests per 1 minute per user
 */
export const apiRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, '1 m'),
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null

/**
 * Helper to check rate limit and return consistent response
 */
export async function checkRateLimit(
  identifier: string,
  type: 'chat' | 'api' = 'api'
): Promise<{ success: boolean; limit?: number; remaining?: number; reset?: number }> {
  const limiter = type === 'chat' ? chatRatelimit : apiRatelimit

  if (!limiter) {
    // Rate limiting disabled - allow all requests
    return { success: true }
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return { success, limit, remaining, reset }
}
