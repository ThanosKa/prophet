import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { EXTRA_CREDITS } from '@/lib/pricing'

const subscriptionCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  tier: z.enum(['pro', 'premium', 'ultra']),
  mode: z.literal('subscription').optional().default('subscription'),
})
const paymentCheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  mode: z.literal('payment'),
  credits: z.number().optional(), // For future variable credit amounts
})

const checkoutSchema = z.discriminatedUnion('mode', [
  subscriptionCheckoutSchema,
  paymentCheckoutSchema,
])

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // Default mode to 'subscription' if not provided (backwards compatibility)
    const parseBody = { ...body, mode: body.mode || 'subscription' }
    const data = checkoutSchema.parse(parseBody)

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://prophetchrome.com'

    // Validate priceId is configured (env vars loaded at build time)
    if (!data.priceId) {
      const tierOrType = data.mode === 'subscription' ? data.tier : 'payment'
      logger.error({ tier: tierOrType }, 'Stripe price ID not configured')
      return NextResponse.json(
        { error: `Checkout not configured. Please contact support.` },
        { status: 500 }
      )
    }

    const isPayment = data.mode === 'payment'
    const metadata: Record<string, string> = isPayment
      ? { userId, type: 'extra_credits', credits: String(EXTRA_CREDITS.credits) }
      : { userId, tier: data.tier }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: data.mode,
      line_items: [{ price: data.priceId, quantity: 1 }],
      success_url: `${appUrl}/account`,
      cancel_url: isPayment ? `${appUrl}/account/billing` : `${appUrl}/pricing`,
      allow_promotion_codes: !isPayment, // No promo codes for one-time credits
      metadata,
      ...(user.stripeCustomerId
        ? { customer: user.stripeCustomerId }
        : { customer_email: user.email }),
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    logger.info(
      { userId, mode: data.mode, sessionId: session.id },
      isPayment ? 'Extra credits checkout session created' : 'Subscription checkout session created'
    )

    return NextResponse.json({ url: session.url })
  } catch (error) {
    logger.error({ error }, 'Failed to create checkout session')

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
