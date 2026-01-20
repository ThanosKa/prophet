import { Redis } from '@upstash/redis'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export type UserTier = 'free' | 'pro' | 'premium' | 'ultra'

export const CACHE_TTL_SECONDS = 300
const CACHE_KEY_PREFIX = 'user:tier:'

const VALID_TIERS: UserTier[] = ['free', 'pro', 'premium', 'ultra']

const isFakeCredentials =
  process.env.UPSTASH_REDIS_REST_URL?.includes('fake') ||
  process.env.UPSTASH_REDIS_REST_TOKEN === 'faketoken123'

export const redis =
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  !isFakeCredentials
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

/**
 * Type guard to validate tier string
 */
function isValidTier(value: string): value is UserTier {
  return VALID_TIERS.includes(value as UserTier)
}

/**
 * Get user tier with Redis caching
 *
 * Cache-aside pattern:
 * 1. Try cache first
 * 2. On miss, query database
 * 3. Populate cache for next request
 * 4. Graceful degradation if Redis unavailable
 *
 * @param userId - The user ID to look up
 * @param redisClient - Optional Redis client (for testing)
 */
export async function getUserTier(
  userId: string,
  redisClient: typeof redis = redis
): Promise<UserTier> {
  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`

  // Try cache first (if Redis available)
  if (redisClient) {
    try {
      const cached = await redisClient.get<string>(cacheKey)

      // Validate cached value is a valid tier
      if (cached && isValidTier(cached)) {
        return cached
      }

      // Invalid cached value - continue to DB (don't log, just fallback)
    } catch (error) {
      logger.error({ error, userId }, 'Redis get failed, falling back to DB')
    }
  }

  // Cache miss or Redis unavailable - query database
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { tier: true },
  })

  const tier: UserTier = user?.tier ?? 'free'

  // Populate cache (best effort, only if user exists)
  if (redisClient && user) {
    try {
      await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, tier)
    } catch (error) {
      logger.error({ error, userId }, 'Failed to cache user tier')
    }
  }

  return tier
}

/**
 * Invalidate cached user tier
 * Call this when user's tier changes (subscription updates, webhooks)
 *
 * @param userId - The user ID to invalidate
 * @param redisClient - Optional Redis client (for testing)
 */
export async function invalidateUserTierCache(
  userId: string,
  redisClient: typeof redis = redis
): Promise<void> {
  if (!redisClient) return

  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`

  try {
    await redisClient.del(cacheKey)
    logger.info({ userId }, 'User tier cache invalidated')
  } catch (error) {
    logger.error({ error, userId }, 'Failed to invalidate user tier cache')
  }
}
