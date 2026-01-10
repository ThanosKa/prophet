import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { ClerkWebhookEvent } from '@/types'
import { error, success } from '@/types'
import { logger } from '@/lib/logger'
import { TIER_CONFIG } from '@/lib/pricing'
import { invalidateUserTierCache } from '@/lib/cache'

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events (user.created, user.updated, user.deleted)
 */
export async function POST(req: Request) {
  try {
    // Get webhook secret
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
      logger.error({}, 'Missing CLERK_WEBHOOK_SECRET')
      return NextResponse.json(
        error('Webhook secret not configured', 'WEBHOOK_SECRET_MISSING'),
        { status: 500 }
      )
    }

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        error('Missing svix headers', 'MISSING_HEADERS'),
        { status: 400 }
      )
    }

    // Get the body
    const payload = await req.json()
    const body = JSON.stringify(payload)

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: ClerkWebhookEvent

    // Verify the webhook
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as ClerkWebhookEvent
    } catch (err) {
      logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Webhook verification failed')
      return NextResponse.json(
        error('Webhook verification failed', 'VERIFICATION_FAILED'),
        { status: 400 }
      )
    }

    // Handle the webhook
    const eventType = evt.type

    if (eventType === 'user.created') {
      const { id, email_addresses, public_metadata } = evt.data

      const primaryEmail = email_addresses[0]?.email_address
      if (!primaryEmail) {
        return NextResponse.json(
          error('No email address found', 'NO_EMAIL'),
          { status: 400 }
        )
      }

      // Create user in database
      await db.insert(users).values({
        id,
        email: primaryEmail,
        tier: (public_metadata?.tier as 'free' | 'pro' | 'premium' | 'ultra') || 'free',
        creditsRemaining: TIER_CONFIG.free.credits,
      })

      logger.info({ userId: id, email: primaryEmail }, 'User created from webhook')
    } else if (eventType === 'user.updated') {
      const { id, email_addresses, public_metadata } = evt.data

      const primaryEmail = email_addresses[0]?.email_address

      // Update user in database
      await db
        .update(users)
        .set({
          email: primaryEmail,
          tier: (public_metadata?.tier as 'free' | 'pro' | 'premium' | 'ultra') || 'free',
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))

      await invalidateUserTierCache(id)

      logger.info({ userId: id, email: primaryEmail }, 'User updated from webhook')
    } else if (eventType === 'user.deleted') {
      const { id } = evt.data

      // Delete user from database (cascade will delete chats, messages, usage records)
      await db.delete(users).where(eq(users.id, id!))

      logger.info({ userId: id }, 'User deleted from webhook')
    }

    return NextResponse.json(success({ received: true }))
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Webhook processing error')
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
