import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { EXTRA_CREDITS } from '@/lib/pricing'

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!EXTRA_CREDITS.priceId) {
      logger.error('STRIPE_PRICE_EXTRA_CREDITS not configured')
      return NextResponse.json({ error: 'Extra credits not configured' }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [{ price: EXTRA_CREDITS.priceId, quantity: 1 }],
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/account/billing`,
      metadata: {
        userId,
        type: 'extra_credits',
        credits: String(EXTRA_CREDITS.credits),
      },
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    logger.info({ userId, sessionId: session.id }, 'Extra credits checkout session created')

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error({ error }, 'Failed to create extra credits checkout session')
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
