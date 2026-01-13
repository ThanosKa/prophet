import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { logger } from '@/lib/logger'
import { TIER_CONFIG } from '@/lib/pricing'
import { invalidateUserTierCache } from '@/lib/cache'

type StripeSubscriptionWithBilling = Stripe.Subscription & {
  current_period_start: number
  current_period_end: number
}

type StripeInvoiceWithSubscription = Stripe.Invoice & {
  subscription?: string
  billing_reason?: string
  period_start: number
  period_end: number
}

export async function POST(request: Request) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    logger.error({ error }, 'Webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as StripeSubscriptionWithBilling
        await handleSubscriptionChange(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as StripeInvoiceWithSubscription
        await handlePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        logger.info({ type: event.type }, 'Unhandled webhook event')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error({ error, eventType: event.type }, 'Webhook handler failed')
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const customerId = session.customer as string

  if (!userId) {
    logger.error({ sessionId: session.id }, 'Missing userId in checkout session')
    return
  }

  if (session.mode === 'payment') {
    const type = session.metadata?.type
    const creditsToAdd = parseInt(session.metadata?.credits || '0', 10)

    if (type === 'extra_credits' && creditsToAdd > 0) {
      await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          creditsRemaining: sql`${users.creditsRemaining} + ${creditsToAdd}`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))

      logger.info({ userId, creditsAdded: creditsToAdd, customerId }, 'Extra credits purchased')
      return
    }
  }

  const tier = session.metadata?.tier as 'pro' | 'premium' | 'ultra'

  if (!tier) {
    logger.error({ sessionId: session.id }, 'Missing tier in subscription checkout session')
    return
  }

  await db
    .update(users)
    .set({
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  logger.info({ userId, tier, customerId }, 'Subscription checkout completed')
}

async function handleSubscriptionChange(subscription: StripeSubscriptionWithBilling) {
  const customerId = subscription.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) {
    logger.error({ customerId }, 'User not found for subscription')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const status = subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'

  const tier = determineTierFromPrice(priceId)
  if (!tier) {
    logger.error({ priceId }, 'Could not determine tier from price')
    return
  }

  const tierConfig = TIER_CONFIG[tier]
  const billingPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : new Date()
  const billingPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : new Date()

  const isFirstSubscription = !user.stripeSubscriptionId

  await db
    .update(users)
    .set({
      tier,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionStatus: status,
      creditsIncluded: tierConfig.credits,
      creditsRemaining: isFirstSubscription ? tierConfig.credits : user.creditsRemaining,
      billingPeriodStart,
      billingPeriodEnd,
      pendingTier: null,
      pendingTierEffectiveDate: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  await invalidateUserTierCache(user.id)

  logger.info({
    userId: user.id,
    tier,
    status,
    isFirstSubscription,
    creditsRemaining: isFirstSubscription ? tierConfig.credits : user.creditsRemaining,
  }, 'Subscription updated')
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) {
    logger.error({ customerId }, 'User not found for deleted subscription')
    return
  }

  await db
    .update(users)
    .set({
      tier: 'free',
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionStatus: null,
      creditsIncluded: TIER_CONFIG.free.credits,
      creditsRemaining: TIER_CONFIG.free.credits,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      pendingTier: null,
      pendingTierEffectiveDate: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  await invalidateUserTierCache(user.id)

  logger.info({ userId: user.id }, 'Subscription canceled, downgraded to free')
}

async function handlePaymentSucceeded(invoice: StripeInvoiceWithSubscription) {
  if (!invoice.subscription) {
    return
  }

  if (invoice.billing_reason !== 'subscription_cycle') {
    return
  }

  const customerId = invoice.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) {
    logger.error({ customerId }, 'User not found for payment')
    return
  }

  const invoicePeriodEnd = new Date(invoice.period_end * 1000)
  const userPeriodEnd = user.billingPeriodEnd

  if (userPeriodEnd && userPeriodEnd.getTime() === invoicePeriodEnd.getTime()) {
    logger.info({ userId: user.id, periodEnd: invoicePeriodEnd }, 'Credits already reset for this billing period')
    return
  }

  const tierConfig = TIER_CONFIG[user.tier]
  const billingPeriodStart = new Date(invoice.period_start * 1000)

  await db
    .update(users)
    .set({
      creditsRemaining: tierConfig.credits,
      billingPeriodStart,
      billingPeriodEnd: invoicePeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  logger.info({ userId: user.id, tier: user.tier, creditsReset: tierConfig.credits, periodStart: billingPeriodStart, periodEnd: invoicePeriodEnd }, 'Monthly credits reset')
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) {
    logger.error({ customerId }, 'User not found for failed payment')
    return
  }

  await db
    .update(users)
    .set({
      subscriptionStatus: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  logger.warn({ userId: user.id }, 'Payment failed, subscription past due')
}

export function determineTierFromPrice(priceId: string): 'pro' | 'premium' | 'ultra' | null {
  // Match against actual price IDs from TIER_CONFIG
  if (TIER_CONFIG.pro.priceId && priceId === TIER_CONFIG.pro.priceId) return 'pro'
  if (TIER_CONFIG.premium.priceId && priceId === TIER_CONFIG.premium.priceId) return 'premium'
  if (TIER_CONFIG.ultra.priceId && priceId === TIER_CONFIG.ultra.priceId) return 'ultra'

  // Fallback to string matching for backwards compatibility
  if (priceId.includes('pro')) return 'pro'
  if (priceId.includes('premium')) return 'premium'
  if (priceId.includes('ultra')) return 'ultra'
  return null
}
