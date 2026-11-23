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

function isValidTier(value: string): value is UserTier {
  return VALID_TIERS.some((tier) => tier === value)
}

export async function getUserTier({
  userId,
  redisClient = redis,
}: {
  userId: string
  redisClient?: typeof redis
}): Promise<UserTier> {
  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`

  if (redisClient) {
    try {
      const cached = await redisClient.get<string>(cacheKey)

      if (cached && isValidTier(cached)) {
        return cached
      }
    } catch (error) {
      logger.error({ error, userId }, 'Redis get failed, falling back to DB')
    }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { tier: true },
  })

  const tier: UserTier = user?.tier ?? 'free'

  if (redisClient && user) {
    try {
      await redisClient.setex(cacheKey, CACHE_TTL_SECONDS, tier)
    } catch (error) {
      logger.error({ error, userId }, 'Failed to cache user tier')
    }
  }

  return tier
}

export async function invalidateUserTierCache({
  userId,
  redisClient = redis,
}: {
  userId: string
  redisClient?: typeof redis
}): Promise<void> {
  if (!redisClient) return

  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`

  try {
    await redisClient.del(cacheKey)
    logger.info({ userId }, 'User tier cache invalidated')
  } catch (error) {
    logger.error({ error, userId }, 'Failed to invalidate user tier cache')
  }
}
