---
name: stripe-billing
description: Stripe subscription billing patterns for SaaS. Use when implementing webhooks, checkout, subscription management, or payment handling.
---

# Stripe Billing Best Practices for SaaS

## Essential Webhooks

These webhooks cover the complete subscription lifecycle for any SaaS application:

| Event | Purpose | Priority |
|-------|---------|----------|
| `checkout.session.completed` | Purchase completion (subscription & one-time) | Essential |
| `customer.subscription.created` | New subscription setup | Essential |
| `customer.subscription.updated` | Plan upgrades/downgrades | Essential |
| `customer.subscription.deleted` | Cancellation handling | Essential |
| `invoice.payment_succeeded` | Monthly credit reset | Essential |
| `invoice.payment_failed` | Mark past_due status | Essential |
| `customer.subscription.trial_will_end` | 3-day trial reminder | Optional |

---

## Webhook Handler Structure

```typescript
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return Response.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object)
        break
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      default:
        logger.info({ type: event.type }, 'Unhandled webhook event')
    }

    return Response.json({ received: true })
  } catch (error) {
    logger.error({ error, eventType: event.type }, 'Webhook handler failed')
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
```

---

## Subscription Lifecycle Patterns

### New Subscription Flow

```
User clicks "Subscribe" → Checkout session created → Stripe checkout page
→ Payment succeeds → checkout.session.completed webhook
→ customer.subscription.created webhook → Database updated → User has access
```

### Checkout Session Creation

```typescript
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { priceId, tier } = await request.json()

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    customer: user?.stripeCustomerId || undefined,
    customer_email: user?.stripeCustomerId ? undefined : user?.email,
    metadata: {
      userId,
      tier,
    },
    allow_promotion_codes: true,
  })

  return Response.json({ url: session.url })
}
```

### Upgrade/Downgrade Handling

**Key Principle**: Preserve credits on plan changes. Only award full credits on first subscription.

```typescript
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) {
    logger.error({ customerId }, 'User not found for subscription')
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  const tier = determineTierFromPrice(priceId)
  const tierConfig = TIER_CONFIG[tier]

  // Credit preservation: Only award credits on FIRST subscription
  const isFirstSubscription = !user.stripeSubscriptionId

  await db.update(users)
    .set({
      tier,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionStatus: subscription.status,
      creditsIncluded: tierConfig.credits,
      // Preserve existing credits on upgrade/downgrade
      creditsRemaining: isFirstSubscription ? tierConfig.credits : user.creditsRemaining,
      billingPeriodStart: new Date(subscription.current_period_start * 1000),
      billingPeriodEnd: new Date(subscription.current_period_end * 1000),
    })
    .where(eq(users.id, user.id))

  await invalidateUserTierCache(user.id)
}
```

### Cancellation Flow

Users cancel via Stripe Customer Portal. The `customer.subscription.deleted` webhook fires after the subscription actually ends (not when they click cancel).

```typescript
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) return

  // Downgrade to free tier
  await db.update(users)
    .set({
      tier: 'free',
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionStatus: null,
      creditsIncluded: TIER_CONFIG.free.credits,
      creditsRemaining: TIER_CONFIG.free.credits,
      billingPeriodStart: null,
      billingPeriodEnd: null,
    })
    .where(eq(users.id, user.id))

  await invalidateUserTierCache(user.id)
}
```

---

## Credit Management

### Monthly Credit Reset

Reset credits when a new billing cycle starts. Prevent duplicate resets by checking billing period.

```typescript
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  // Only process subscription renewals, not initial payments
  if (invoice.billing_reason !== 'subscription_cycle') {
    return
  }

  const customerId = invoice.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) return

  // Prevent duplicate credit resets
  const invoicePeriodEnd = new Date(invoice.period_end * 1000)
  if (user.billingPeriodEnd?.getTime() === invoicePeriodEnd.getTime()) {
    logger.info('Credits already reset for this billing period')
    return
  }

  const tierConfig = TIER_CONFIG[user.tier]

  await db.update(users)
    .set({
      creditsRemaining: tierConfig.credits,
      billingPeriodStart: new Date(invoice.period_start * 1000),
      billingPeriodEnd: invoicePeriodEnd,
    })
    .where(eq(users.id, user.id))
}
```

### One-Time Credit Purchases

Handle credit top-ups separately from subscriptions:

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const customerId = session.customer as string

  if (!userId) return

  // Handle one-time credit purchase
  if (session.mode === 'payment') {
    const type = session.metadata?.type
    const creditsToAdd = parseInt(session.metadata?.credits || '0', 10)

    if (type === 'extra_credits' && creditsToAdd > 0) {
      // Use SQL expression for concurrent-safe credit addition
      await db.update(users)
        .set({
          stripeCustomerId: customerId,
          creditsRemaining: sql`${users.creditsRemaining} + ${creditsToAdd}`,
        })
        .where(eq(users.id, userId))

      return
    }
  }

  // Handle subscription checkout (store customer ID)
  await db.update(users)
    .set({ stripeCustomerId: customerId })
    .where(eq(users.id, userId))
}
```

---

## Customer Portal Integration

Let users manage their own subscriptions (cancel, upgrade, update payment):

```typescript
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  // Require existing Stripe customer
  if (!user?.stripeCustomerId) {
    return Response.json({ error: 'No subscription found' }, { status: 400 })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/account/billing`,
  })

  return Response.json({ url: session.url })
}
```

**Portal capabilities** (configured in Stripe Dashboard):
- Cancel subscription
- Upgrade/downgrade plan
- Update payment method
- View invoices
- Update billing address

---

## Failed Payment Handling

Mark subscription as past_due when payment fails. Stripe automatically retries for up to 7 days.

```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const user = await db.query.users.findFirst({
    where: eq(users.stripeCustomerId, customerId),
  })

  if (!user) return

  await db.update(users)
    .set({ subscriptionStatus: 'past_due' })
    .where(eq(users.id, user.id))

  // Optional: Send email notification
  // await sendPaymentFailedEmail(user.email)
}
```

**Best practice**: Keep user access during past_due period. Stripe retries automatically. Consider showing a banner prompting payment method update.

---

## Webhook Security

### Signature Verification

Always verify webhooks are from Stripe:

```typescript
try {
  event = stripe.webhooks.constructEvent(
    body,           // Raw request body (not parsed JSON)
    signature,      // stripe-signature header
    webhookSecret   // STRIPE_WEBHOOK_SECRET env var
  )
} catch (error) {
  return Response.json({ error: 'Invalid signature' }, { status: 400 })
}
```

### Raw Body Handling

Next.js App Router provides raw body via `request.text()`. If using Pages Router or other frameworks, ensure body isn't parsed before verification:

```typescript
// Next.js App Router - works automatically
const body = await request.text()

// Next.js Pages Router - disable body parsing
export const config = {
  api: { bodyParser: false }
}
```

### Idempotency

Stripe may send the same event multiple times. Guard against duplicate processing:

1. **Billing period check** (for credit resets):
   ```typescript
   if (user.billingPeriodEnd?.getTime() === invoicePeriodEnd.getTime()) {
     return // Already processed
   }
   ```

2. **Event ID logging** (optional, more robust):
   ```typescript
   const processed = await redis.get(`stripe:event:${event.id}`)
   if (processed) return
   await redis.set(`stripe:event:${event.id}`, '1', 'EX', 86400) // 24h TTL
   ```

---

## Testing Stripe Locally

### Stripe CLI Setup

```bash
# Install Stripe CLI
# macOS: brew install stripe/stripe-cli/stripe
# Windows: scoop install stripe

# Login to your Stripe account
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
# Copy the webhook signing secret and add to .env.local
```

### Trigger Test Events

```bash
# Test checkout completion
stripe trigger checkout.session.completed

# Test subscription lifecycle
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# Test billing events
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### Test Card Numbers

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0027 6000 3184` | Requires 3D Secure |

---

## Tier Determination

Map Stripe price IDs to your tier system:

```typescript
export function determineTierFromPrice(priceId: string): 'pro' | 'premium' | 'ultra' | null {
  // Match against configured price IDs
  if (TIER_CONFIG.pro.priceId && priceId === TIER_CONFIG.pro.priceId) return 'pro'
  if (TIER_CONFIG.premium.priceId && priceId === TIER_CONFIG.premium.priceId) return 'premium'
  if (TIER_CONFIG.ultra.priceId && priceId === TIER_CONFIG.ultra.priceId) return 'ultra'

  // Fallback to string matching (for development/testing)
  if (priceId.includes('pro')) return 'pro'
  if (priceId.includes('premium')) return 'premium'
  if (priceId.includes('ultra')) return 'ultra'

  return null
}
```

---

## Environment Variables

```bash
# Stripe API
STRIPE_SECRET_KEY=sk_live_...           # Server-side API key
STRIPE_WEBHOOK_SECRET=whsec_...         # Webhook signature verification

# Price IDs (from Stripe Dashboard → Products)
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...
STRIPE_PRICE_ULTRA=price_...
STRIPE_PRICE_EXTRA_CREDITS=price_...    # One-time credit purchase
```

---

## Quick Checklist

When implementing Stripe billing:

- [ ] **Essential webhooks**: checkout.session.completed, subscription.created/updated/deleted, invoice.payment_succeeded/failed
- [ ] **Signature verification** on all webhook requests
- [ ] **Credit preservation** on plan upgrades/downgrades
- [ ] **Duplicate prevention** for credit resets (check billing period)
- [ ] **Customer Portal** for self-service management
- [ ] **Concurrent-safe** credit updates with SQL expressions
- [ ] **Cache invalidation** when tier changes
- [ ] **Logging** for debugging webhook issues
- [ ] **Local testing** with Stripe CLI

---

## Anti-Patterns to Avoid

- **Trusting client-side tier data** - Always determine tier from Stripe price ID in webhook
- **Resetting credits on every subscription.updated** - Use isFirstSubscription check
- **Parsing JSON body before signature verification** - Use raw body
- **Missing idempotency** - Webhooks can be delivered multiple times
- **Immediate access revocation on cancellation** - Let subscription run until period end
- **Storing sensitive Stripe data** - Only store IDs, not full payment details
