'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { logger } from '@/lib/logger'
import { TIER_CONFIG } from '@/lib/pricing'
import { eq } from 'drizzle-orm'

/**
 * Ensures a user exists in the database and is synced with Clerk.
 * Returns the user record.
 * Throws an error if unauthorized or sync fails.
 */
export async function ensureDbUser() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized')
  }

  // Try to find user first
  let user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  // If user exists and was updated recently, return it
  // (Optional: add a threshold for sync frequency if needed)
  if (user) {
    return user
  }

  // If not found, sync from Clerk
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)

  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) {
    throw new Error('Email not found in Clerk')
  }

  const [newUser] = await db
    .insert(users)
    .values({
      id: userId,
      email,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      profileImageUrl: clerkUser.imageUrl,
      tier: 'free',
      creditsRemaining: TIER_CONFIG.free.credits,
      creditsIncluded: TIER_CONFIG.free.credits,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        profileImageUrl: clerkUser.imageUrl,
        updatedAt: new Date(),
      },
    })
    .returning()

  logger.info({ userId }, 'User synced to database via ensureDbUser')
  return newUser
}

