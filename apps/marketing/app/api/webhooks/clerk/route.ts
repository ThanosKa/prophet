import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { error, success, INTERNAL_ERROR_MESSAGE } from '@/types'
import { logger } from '@/lib/logger'
import { TIER_CONFIG } from '@/lib/pricing'
import { sendWelcomeEmail } from '@/lib/email'

const clerkUserSchema = z.object({
  id: z.string(),
  email_addresses: z.array(z.object({ email_address: z.string() })),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
})

// public_metadata is deliberately not read: Stripe webhooks own `tier`.
const clerkWebhookEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user.created'), data: clerkUserSchema }),
  z.object({ type: z.literal('user.updated'), data: clerkUserSchema }),
  z.object({ type: z.literal('user.deleted'), data: z.object({ id: z.string() }) }),
])

/**
 * POST /api/webhooks/clerk
 * Handle Clerk webhook events (user.created, user.updated, user.deleted)
 */
export async function POST(req: Request) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
      logger.error({}, 'Missing CLERK_WEBHOOK_SECRET')
      return NextResponse.json(
        error('Webhook secret not configured', 'WEBHOOK_SECRET_MISSING'),
        { status: 500 }
      )
    }

    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        error('Missing svix headers', 'MISSING_HEADERS'),
        { status: 400 }
      )
    }

    const payload = await req.json()
    const body = JSON.stringify(payload)

    const wh = new Webhook(WEBHOOK_SECRET)

    let verifiedPayload: unknown

    try {
      verifiedPayload = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch (err) {
      logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Webhook verification failed')
      return NextResponse.json(
        error('Webhook verification failed', 'VERIFICATION_FAILED'),
        { status: 400 }
      )
    }

    const parsed = clerkWebhookEventSchema.safeParse(verifiedPayload)

    if (!parsed.success) {
      const isUnhandledEventType = parsed.error.issues.some(
        (issue) => issue.code === 'invalid_union_discriminator'
      )
      if (isUnhandledEventType) {
        return NextResponse.json(success({ received: true }))
      }

      logger.error({ issues: parsed.error.issues }, 'Invalid Clerk webhook payload')
      return NextResponse.json(
        error('Invalid webhook payload', 'INVALID_PAYLOAD'),
        { status: 400 }
      )
    }

    const evt = parsed.data

    if (evt.type === 'user.created') {
      const { id, email_addresses, first_name, last_name } = evt.data

      const primaryEmail = email_addresses[0]?.email_address
      if (!primaryEmail) {
        return NextResponse.json(
          error('No email address found', 'NO_EMAIL'),
          { status: 400 }
        )
      }

      await db.insert(users).values({
        id,
        email: primaryEmail,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        tier: 'free',
        creditsRemaining: TIER_CONFIG.free.credits,
      })

      sendWelcomeEmail({
        to: primaryEmail,
        firstName: first_name,
        lastName: last_name,
      }).catch(() => {})

      logger.info({ userId: id, email: primaryEmail }, 'User created from webhook')
    } else if (evt.type === 'user.updated') {
      const { id, email_addresses, first_name, last_name } = evt.data

      const primaryEmail = email_addresses[0]?.email_address

      await db
        .update(users)
        .set({
          email: primaryEmail,
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))

      logger.info({ userId: id, email: primaryEmail }, 'User updated from webhook')
    } else {
      const { id } = evt.data

      // Delete user from database (cascade will delete chats, messages, usage records)
      await db.delete(users).where(eq(users.id, id))

      logger.info({ userId: id }, 'User deleted from webhook')
    }

    return NextResponse.json(success({ received: true }))
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Webhook processing error')
    return NextResponse.json(
      error(INTERNAL_ERROR_MESSAGE, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}
