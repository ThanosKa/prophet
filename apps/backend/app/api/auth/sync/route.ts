import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { logger } from '@/lib/logger'

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)

    const email = clerkUser.emailAddresses[0]?.emailAddress
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 })
    }

    await db
      .insert(users)
      .values({
        id: userId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        profileImageUrl: clerkUser.imageUrl,
        tier: 'free',
        creditsRemaining: 100,
        creditsIncluded: 100,
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

    logger.info({ userId }, 'User synced to database')

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Failed to sync user')
    return NextResponse.json(
      { error: 'Failed to sync user' },
      { status: 500 }
    )
  }
}
