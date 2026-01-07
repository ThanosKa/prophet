---
name: upstash-workflow
description: Durable multi-step orchestration for complex async processes. Use when coordinating long-running workflows, handling state between steps, or managing human-in-the-loop approvals.
---

# Upstash Workflow: Multi-Step Orchestration

**Documentation Sources**: Upstash Workflow official documentation + 2025 industry best practices for serverless orchestration.

**Note**: For simple background jobs and message queues, see the QStash skill (`.claude/skills/backend/qstash/SKILL.md`). Workflow is optimized for complex multi-step processes with state management.

## Workflow vs QStash: When to Use Each

Choose the right tool based on complexity and state requirements:

| Aspect | Workflow | QStash |
|--------|----------|--------|
| **Purpose** | Multi-step orchestration | Background jobs, message queues |
| **State Model** | Persists step outputs automatically | Message-based (stateless) |
| **Use Case** | Complex business logic (5+ steps) | Fire-and-forget tasks (1 step) |
| **Examples** | User onboarding (email → trial → engage) | Send email, process image |
| **Step Coordination** | Built-in (context.run, sleep, waitForEvent) | Manual (multiple QStash messages) |
| **Retry Behavior** | Failed steps retry independently | Entire message retries |
| **Best For** | Long-running, dependent steps | Simple async tasks, scheduling |

**Decision Matrix**:
- **Use QStash** if: Single async task, no state needed, simple retry
- **Use Workflow** if: Multiple dependent steps, state between steps, conditional logic, long-running (>15 min), human approval needed

---

## Core Architecture

Upstash Workflow decomposes complex business logic into **modular steps** that execute as separate requests.

### Step-by-Step Execution Model

Each step:
1. Executes as a separate serverless function invocation
2. Returns output that's automatically persisted
3. Passes output to next step
4. Retries independently on failure (not entire workflow)

**Benefit**: Each step gets full serverless timeout (15-30 minutes), avoiding monolithic function timeouts.

### State Persistence Between Steps

Workflow automatically stores step outputs without external database.

✅ **GOOD: State managed by Workflow**

```typescript
import { serve } from '@upstash/workflow/nextjs'

export const { POST } = serve(async (context) => {
  // Step 1: Fetch user data
  const user = await context.run('fetch-user', async () => {
    return await db.users.findUnique({ where: { id: userId } })
  })

  // Step 2: user data is available (persisted by Workflow)
  const emailSent = await context.run('send-email', async () => {
    await emailProvider.send({
      to: user.email, // ✅ user data from Step 1
      template: 'welcome',
    })
    return true
  })

  // Step 3: both user and emailSent available
  await context.run('track-event', async () => {
    await analytics.track({
      userId: user.id,
      event: 'welcome_email_sent',
      emailSent, // ✅ emailSent from Step 2
    })
  })
})
```

❌ **BAD: Manual state management with QStash**

```typescript
// PROBLEM: Manual state management across multiple QStash messages
async function onboardUser(userId: string) {
  // Step 1: Fetch user
  const user = await db.users.findUnique({ where: { id: userId } })

  // ❌ Send user data to next step manually
  await qstash.publishJSON({
    url: `${API_URL}/send-email`,
    body: { user }, // Manual state passing
  })
}

async function sendEmailEndpoint(req: Request) {
  const { user } = await req.json()

  await emailProvider.send({ to: user.email, template: 'welcome' })

  // ❌ Send user data to next step manually
  await qstash.publishJSON({
    url: `${API_URL}/track-event`,
    body: { user }, // Manual state passing
  })
}

// ✅ Workflow handles state automatically
```

### Failed Steps Retry Independently

If Step 3 fails, only Step 3 retries (Steps 1 and 2 don't re-execute).

✅ **GOOD: Granular retry without re-execution**

```typescript
export const { POST } = serve(async (context) => {
  // Step 1: Expensive operation (10 minutes)
  const processed = await context.run('process-video', async () => {
    return await processVideo(videoUrl) // 10 minutes
  })

  // Step 2: Upload to storage (fails sometimes)
  const uploaded = await context.run('upload', async () => {
    // If this fails, only Step 2 retries (not Step 1!)
    return await s3.upload(processed.file)
  })

  // ✅ Step 1 never re-executes, even if Step 2 retries 5 times
})
```

### No External Database Needed

Workflow persists state internally - no Redis, database, or external storage required.

---

## Multi-Step Patterns

### Customer Onboarding Sequence

✅ **GOOD: Multi-step onboarding with delays**

```typescript
import { serve } from '@upstash/workflow/nextjs'

export const { POST } = serve<{ userId: string }>(async (context) => {
  const { userId } = context.requestPayload

  // Step 1: Send welcome email
  await context.run('send-welcome', async () => {
    const user = await db.users.findUnique({ where: { id: userId } })
    await emailProvider.send({
      to: user.email,
      template: 'welcome',
    })
  })

  // Step 2: Wait 1 day
  await context.sleep('wait-1-day', 86400) // 24 hours

  // Step 3: Send getting started guide
  await context.run('send-guide', async () => {
    const user = await db.users.findUnique({ where: { id: userId } })
    await emailProvider.send({
      to: user.email,
      template: 'getting-started',
    })
  })

  // Step 4: Wait 3 days
  await context.sleep('wait-3-days', 259200) // 72 hours

  // Step 5: Send tips and tricks
  await context.run('send-tips', async () => {
    const user = await db.users.findUnique({ where: { id: userId } })
    await emailProvider.send({
      to: user.email,
      template: 'tips-and-tricks',
    })
  })

  // Step 6: Wait 7 days
  await context.sleep('wait-7-days', 604800) // 168 hours

  // Step 7: Check engagement and send survey
  await context.run('send-survey', async () => {
    const user = await db.users.findUnique({ where: { id: userId } })
    const engaged = await checkUserEngagement(userId)

    if (engaged) {
      await emailProvider.send({
        to: user.email,
        template: 'feedback-survey',
      })
    }
  })
})
```

### Order Fulfillment Workflow

✅ **GOOD: Order processing with conditional logic**

```typescript
export const { POST } = serve<{ orderId: string }>(async (context) => {
  const { orderId } = context.requestPayload

  // Step 1: Verify inventory
  const inventoryCheck = await context.run('verify-inventory', async () => {
    const order = await db.orders.findUnique({ where: { id: orderId } })
    const available = await checkInventory(order.items)
    return { available, order }
  })

  if (!inventoryCheck.available) {
    // Early termination: inventory unavailable
    await context.run('notify-out-of-stock', async () => {
      await notifyCustomer(orderId, 'out-of-stock')
    })
    return { status: 'cancelled', reason: 'out-of-stock' }
  }

  // Step 2: Charge payment
  const payment = await context.run('charge-payment', async () => {
    return await stripe.charges.create({
      amount: inventoryCheck.order.total,
      currency: 'usd',
      customer: inventoryCheck.order.customerId,
    })
  })

  // Step 3: Reserve inventory
  await context.run('reserve-inventory', async () => {
    await reserveItems(inventoryCheck.order.items)
  })

  // Step 4: Dispatch to warehouse
  const shipment = await context.run('dispatch', async () => {
    return await warehouse.createShipment({
      orderId,
      items: inventoryCheck.order.items,
    })
  })

  // Step 5: Send confirmation email
  await context.run('send-confirmation', async () => {
    await emailProvider.send({
      to: inventoryCheck.order.customerEmail,
      template: 'order-confirmed',
      data: {
        orderId,
        trackingNumber: shipment.trackingNumber,
      },
    })
  })

  return { status: 'completed', trackingNumber: shipment.trackingNumber }
})
```

### Payment Retry with Progressive Delays

✅ **GOOD: Payment retry workflow**

```typescript
export const { POST } = serve<{ paymentId: string }>(async (context) => {
  const { paymentId } = context.requestPayload

  // Step 1: First attempt
  const firstAttempt = await context.run('attempt-1', async () => {
    try {
      return await chargePayment(paymentId)
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  if (firstAttempt.success) return { status: 'paid' }

  // Wait 1 hour before retry
  await context.sleep('wait-1-hour', 3600)

  // Step 2: Second attempt
  const secondAttempt = await context.run('attempt-2', async () => {
    try {
      return await chargePayment(paymentId)
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  if (secondAttempt.success) return { status: 'paid' }

  // Wait 1 day before retry
  await context.sleep('wait-1-day', 86400)

  // Step 3: Third attempt
  const thirdAttempt = await context.run('attempt-3', async () => {
    try {
      return await chargePayment(paymentId)
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  if (thirdAttempt.success) return { status: 'paid' }

  // Wait 1 week before final retry
  await context.sleep('wait-1-week', 604800)

  // Step 4: Final attempt
  const finalAttempt = await context.run('final-attempt', async () => {
    try {
      return await chargePayment(paymentId)
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  if (finalAttempt.success) return { status: 'paid' }

  // All retries failed - notify and cancel
  await context.run('payment-failed', async () => {
    await notifyAdmin(`Payment ${paymentId} failed after all retries`)
    await db.payments.update({
      where: { id: paymentId },
      data: { status: 'failed' },
    })
  })

  return { status: 'failed' }
})
```

---

## State Management

### context.run() for Individual Steps

Each `context.run()` call:
1. Executes once (idempotent)
2. Persists output automatically
3. Passes output to next steps
4. Retries only on failure

✅ **GOOD: Clear step boundaries**

```typescript
export const { POST } = serve(async (context) => {
  // Step 1: Returns output
  const user = await context.run('fetch-user', async () => {
    return await db.users.findUnique({ where: { id: userId } })
  })

  // Step 2: Uses user from Step 1
  const subscription = await context.run('fetch-subscription', async () => {
    return await stripe.subscriptions.retrieve(user.stripeSubscriptionId)
  })

  // Step 3: Uses both user and subscription
  await context.run('send-invoice', async () => {
    await emailProvider.send({
      to: user.email,
      template: 'invoice',
      data: {
        amount: subscription.plan.amount,
      },
    })
  })
})
```

### Immutable Step Outputs

✅ **GOOD: Treat step outputs as immutable**

```typescript
export const { POST } = serve(async (context) => {
  const data = await context.run('fetch-data', async () => {
    return { count: 0, items: [] }
  })

  // ✅ Use data, don't modify it
  await context.run('process-data', async () => {
    const processed = { ...data, count: data.items.length } // Create new object
    await saveData(processed)
  })
})
```

❌ **BAD: Shared mutable state between steps**

```typescript
// PROBLEM: Steps shouldn't share mutable state
let sharedState = { count: 0 } // ❌ Global mutable state

export const { POST } = serve(async (context) => {
  await context.run('step-1', async () => {
    sharedState.count++ // ❌ Mutating shared state
  })

  await context.run('step-2', async () => {
    console.log(sharedState.count) // ❌ Unreliable (step might retry)
  })
})

// ✅ BETTER: Pass state explicitly via return values
export const { POST } = serve(async (context) => {
  const state = await context.run('step-1', async () => {
    return { count: 1 } // ✅ Return state
  })

  await context.run('step-2', async () => {
    console.log(state.count) // ✅ Reliable
  })
})
```

---

## Timing & Delays

### context.sleep() for Fixed Delays

✅ **GOOD: Sleep between steps**

```typescript
export const { POST } = serve(async (context) => {
  // Send first email
  await context.run('send-email-1', async () => {
    await emailProvider.send({ template: 'onboarding-1' })
  })

  // Wait 3 days
  await context.sleep('wait-3-days', 259200) // 72 hours in seconds

  // Send second email
  await context.run('send-email-2', async () => {
    await emailProvider.send({ template: 'onboarding-2' })
  })
})
```

### context.sleepUntil() for Specific Timestamps

✅ **GOOD: Sleep until specific time**

```typescript
export const { POST } = serve(async (context) => {
  // Process immediately
  await context.run('start-trial', async () => {
    await db.users.update({
      where: { id: userId },
      data: { trialEndsAt: new Date(Date.now() + 14 * 86400000) },
    })
  })

  // Calculate trial end date
  const trialEndDate = Math.floor(Date.now() / 1000) + (14 * 86400) // 14 days

  // Sleep until trial ends
  await context.sleepUntil('wait-trial-end', trialEndDate)

  // Send trial expiration email
  await context.run('send-expiration', async () => {
    await emailProvider.send({ template: 'trial-expired' })
  })
})
```

### Progressive Delays (Retry Patterns)

✅ **GOOD: Increasing delays for retries**

```typescript
export const { POST } = serve(async (context) => {
  const delays = [3600, 86400, 604800] // 1 hour, 1 day, 1 week

  for (let i = 0; i < delays.length; i++) {
    const attempt = await context.run(`attempt-${i + 1}`, async () => {
      try {
        return await performOperation()
      } catch (error) {
        return { success: false }
      }
    })

    if (attempt.success) return { status: 'completed' }

    // Wait before next retry
    if (i < delays.length - 1) {
      await context.sleep(`wait-${i + 1}`, delays[i])
    }
  }

  return { status: 'failed' }
})
```

❌ **BAD: Busy-waiting or polling**

```typescript
// PROBLEM: Polling wastes resources
export const { POST } = serve(async (context) => {
  await context.run('start-job', async () => {
    await startLongRunningJob(jobId)
  })

  // ❌ Polling every 10 seconds
  let completed = false
  while (!completed) {
    await context.sleep('poll', 10)
    const status = await context.run('check-status', async () => {
      return await checkJobStatus(jobId)
    })
    completed = status.completed
  }
})

// ✅ BETTER: Use waitForEvent (see next section)
```

---

## Event-Driven Coordination

### context.waitForEvent() for External Signals

Use when workflow needs to pause for external events (user confirmation, webhook, async job completion).

✅ **GOOD: Wait for external event**

```typescript
export const { POST } = serve<{ userId: string }>(async (context) => {
  const { userId } = context.requestPayload

  // Step 1: Send email verification
  const verificationToken = await context.run('send-verification', async () => {
    const token = generateToken()
    await emailProvider.send({
      to: user.email,
      template: 'verify-email',
      data: { verificationUrl: `${APP_URL}/verify?token=${token}` },
    })
    return token
  })

  // Step 2: Wait for user to verify email (external event)
  const verified = await context.waitForEvent('email-verified', {
    timeout: '7d', // Wait up to 7 days
  })

  if (!verified) {
    // Timeout - email not verified
    await context.run('send-reminder', async () => {
      await emailProvider.send({ template: 'verify-reminder' })
    })
    return { status: 'verification-timeout' }
  }

  // Step 3: Email verified - continue onboarding
  await context.run('complete-onboarding', async () => {
    await db.users.update({
      where: { id: userId },
      data: { emailVerified: true },
    })
  })

  return { status: 'onboarded' }
})

// Trigger event from webhook/endpoint
import { WorkflowClient } from '@upstash/workflow'

async function verifyEmailEndpoint(token: string) {
  // Verify token...
  const userId = await verifyToken(token)

  // Notify workflow to continue
  const client = new WorkflowClient({ token: process.env.QSTASH_TOKEN! })
  await client.notify({
    eventId: 'email-verified',
    eventData: { userId, verified: true },
  })

  return { success: true }
}
```

### Human-in-the-Loop Approvals

✅ **GOOD: Wait for manual approval**

```typescript
export const { POST } = serve<{ documentId: string }>(async (context) => {
  const { documentId } = context.requestPayload

  // Step 1: Submit for review
  await context.run('submit-review', async () => {
    await db.documents.update({
      where: { id: documentId },
      data: { status: 'pending-review' },
    })

    // Notify reviewer
    await notifyReviewer(documentId)
  })

  // Step 2: Wait for approval (up to 3 days)
  const approval = await context.waitForEvent('document-approved', {
    timeout: '3d',
  })

  if (!approval || approval.approved === false) {
    // Rejected or timeout
    await context.run('handle-rejection', async () => {
      await db.documents.update({
        where: { id: documentId },
        data: { status: 'rejected' },
      })
    })
    return { status: 'rejected' }
  }

  // Step 3: Approved - publish
  await context.run('publish', async () => {
    await db.documents.update({
      where: { id: documentId },
      data: { status: 'published', publishedAt: new Date() },
    })
  })

  return { status: 'published' }
})
```

### Webhook-Triggered Continuations

✅ **GOOD: Continue workflow on webhook**

```typescript
export const { POST } = serve<{ paymentId: string }>(async (context) => {
  const { paymentId } = context.requestPayload

  // Step 1: Create payment intent
  const intent = await context.run('create-intent', async () => {
    return await stripe.paymentIntents.create({
      amount: 1000,
      currency: 'usd',
    })
  })

  // Step 2: Wait for Stripe webhook (payment confirmed)
  const payment = await context.waitForEvent('payment-confirmed', {
    timeout: '1h', // Wait up to 1 hour for payment
  })

  if (!payment) {
    // Payment timeout
    await context.run('cancel-payment', async () => {
      await stripe.paymentIntents.cancel(intent.id)
    })
    return { status: 'cancelled' }
  }

  // Step 3: Payment confirmed - fulfill order
  await context.run('fulfill-order', async () => {
    await fulfillOrder(payment.orderId)
  })

  return { status: 'completed' }
})

// Stripe webhook triggers event
async function stripeWebhook(event: StripeEvent) {
  if (event.type === 'payment_intent.succeeded') {
    const client = new WorkflowClient({ token: process.env.QSTASH_TOKEN! })
    await client.notify({
      eventId: 'payment-confirmed',
      eventData: { paymentId: event.data.object.id },
    })
  }
}
```

❌ **BAD: Polling instead of waitForEvent**

```typescript
// PROBLEM: Wasteful polling
export const { POST } = serve(async (context) => {
  await context.run('start', async () => {
    await startAsyncJob(jobId)
  })

  // ❌ Poll every 10 seconds for up to 1 hour
  for (let i = 0; i < 360; i++) {
    await context.sleep('poll', 10)
    const status = await context.run('check', async () => {
      return await checkJobStatus(jobId)
    })
    if (status.completed) break
  }
})

// ✅ BETTER: Use waitForEvent
export const { POST } = serve(async (context) => {
  await context.run('start', async () => {
    await startAsyncJob(jobId)
  })

  const result = await context.waitForEvent('job-completed', {
    timeout: '1h',
  })
})
```

---

## Parallel Execution

### context.call() for Parallel Tasks

Execute multiple independent tasks concurrently.

✅ **GOOD: Parallel execution with synchronized completion**

```typescript
export const { POST } = serve<{ imageUrls: string[] }>(async (context) => {
  const { imageUrls } = context.requestPayload

  // Process all images in parallel
  const results = await context.call('process-images', async () => {
    return await Promise.all(
      imageUrls.map(async (url) => {
        const resized = await resizeImage(url)
        const compressed = await compressImage(resized)
        return compressed
      })
    )
  })

  // All images processed - upload to storage
  await context.run('upload', async () => {
    await uploadBatch(results)
  })

  return { processed: results.length }
})
```

### Map/Reduce Patterns

✅ **GOOD: Parallel processing with aggregation**

```typescript
export const { POST } = serve<{ userIds: string[] }>(async (context) => {
  const { userIds } = context.requestPayload

  // Step 1: Process all users in parallel
  const reports = await context.call('generate-reports', async () => {
    return await Promise.all(
      userIds.map(async (userId) => {
        return await generateUserReport(userId)
      })
    )
  })

  // Step 2: Aggregate results
  const summary = await context.run('aggregate', async () => {
    return {
      totalUsers: reports.length,
      totalRevenue: reports.reduce((sum, r) => sum + r.revenue, 0),
      averageEngagement: reports.reduce((sum, r) => sum + r.engagement, 0) / reports.length,
    }
  })

  // Step 3: Send summary email
  await context.run('send-summary', async () => {
    await emailProvider.send({
      template: 'weekly-summary',
      data: summary,
    })
  })

  return summary
})
```

❌ **BAD: Sequential when parallel is safe**

```typescript
// PROBLEM: 10 images processed sequentially (100s total)
export const { POST } = serve(async (context) => {
  const results = []

  for (const url of imageUrls) {
    // ❌ Sequential - 10s each × 10 images = 100s
    const processed = await context.run(`process-${url}`, async () => {
      return await processImage(url) // 10 seconds
    })
    results.push(processed)
  }
})

// ✅ BETTER: Parallel - all complete in ~10s
export const { POST } = serve(async (context) => {
  const results = await context.call('process-all', async () => {
    return await Promise.all(
      imageUrls.map(url => processImage(url))
    )
  })
})
```

---

## Quick Checklist

Before deploying Workflow to production:

- [ ] All steps are idempotent (safe to retry)
- [ ] Proper error handling per step
- [ ] State passed explicitly via return values (no shared mutable state)
- [ ] Monitoring for stalled workflows (>24h)
- [ ] DLQ configured and monitored
- [ ] Proper delays between retries (progressive)
- [ ] Using events instead of polling (waitForEvent)
- [ ] Cost-aware step design (combine where appropriate)
- [ ] Timeouts set on waitForEvent (don't wait forever)
- [ ] Parallel execution for independent tasks (context.call)
- [ ] Early termination when conditions met
- [ ] Cleanup steps for resource management

---

## Real-World Reference Numbers (2025)

**Step Timeout**:
- Most serverless platforms: 15-30 minutes per step
- Design for: Each step completes within timeout

**Retry Delays**:
- Progressive: 1 hour → 1 day → 1 week (payment retries)
- Email verification: Wait up to 7 days
- Human approval: Wait up to 3 days

**Workflow Duration**:
- Design for: Workflows up to 30 days
- Monitor: Alert if >24h without progress (stalled)

**Idempotency**:
- Critical: All steps must be idempotent
- At-least-once delivery: Steps may execute multiple times

**Event Timeouts**:
- Email verification: 7 days
- Payment confirmation: 1 hour
- Manual approval: 3 days
- Webhook events: Based on provider SLA

**Cost Threshold**:
- Optimize after: ~10K workflows/month
- Monitor: Step count per workflow (target <20 steps)

**Industry References**:
- [Upstash Workflow Documentation](https://upstash.com/docs/qstash/workflow)
- Serverless orchestration best practices (2025)
