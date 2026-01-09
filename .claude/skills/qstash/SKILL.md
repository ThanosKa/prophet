---
name: qstash
description: Serverless messaging and scheduling for background jobs, cron tasks, and reliable async workflows. Use when implementing background processing, scheduled tasks, message queues, or webhooks with automatic retries.
---

# QStash: Background Jobs & Message Queues

**Documentation Sources**: Upstash QStash official documentation + 2025 industry best practices for serverless messaging.

**Note**: For complex multi-step workflows with state management, see the Upstash Workflow skill (`.claude/skills/backend/upstash-workflow/SKILL.md`). QStash is optimized for simple background jobs and message queues.

## When to Use QStash vs Workflow

Choose the right tool for your use case:

| Feature | QStash | Workflow |
|---------|--------|----------|
| **Purpose** | Background jobs, message queues | Multi-step orchestration |
| **Use Case** | Fire-and-forget tasks | Complex business logic |
| **State** | Message-based (stateless) | Persists step outputs |
| **Examples** | Send email, process image | User onboarding flow (5 steps) |
| **Complexity** | Simple, single-step | Multiple dependent steps |
| **Best For** | Async tasks, scheduling | Coordinating long workflows |

**Rule of Thumb**: Use QStash for single async tasks. Use Workflow when you need to coordinate multiple steps with state.

---

## Core Concepts

### Publish-Subscribe Model

QStash acts as a **middleman** between your application and destination APIs, guaranteeing delivery with automatic retries.

**Flow**:
1. Your app publishes message to QStash
2. QStash delivers message to your destination URL
3. QStash retries on failure with exponential backoff
4. Failed messages go to Dead Letter Queue (DLQ)

### Automatic Retries with Exponential Backoff

QStash automatically retries failed deliveries with increasing delays using the formula: `delay = min(86400, e^(2.5*n))` seconds.

**Default backoff timeline**:
- Retry 1: ~12 seconds
- Retry 2: ~2 minutes 28 seconds
- Retry 3: ~30 minutes 8 seconds
- Retry 4: ~6 hours 7 minutes
- Retry 5+: 24 hours (capped at 86400 seconds)

**Configurable**: Set max retries (0-10+) and custom `retryDelay` expressions (e.g., `pow(2, retried) * 1000` for doubling delays).

### Dead Letter Queue (DLQ)

Messages that fail all retries are moved to the DLQ for manual investigation and recovery.

### Message Signing

QStash signs all messages with a secret key. Verify signatures to ensure messages are authentic (not spoofed).

---

## Background Jobs Patterns

Use QStash to offload long-running tasks from user-facing requests.

### Image Processing

✅ **GOOD: Async image processing with retry**

```typescript
import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
})

// User uploads image - immediately return success
async function handleImageUpload(imageUrl: string, userId: string) {
  // Publish background job to QStash
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/process-image`,
    body: {
      imageUrl,
      userId,
      operations: ['resize', 'compress', 'generate-thumbnail'],
    },
    retries: 3, // Retry up to 3 times on failure
  })

  return { success: true, message: 'Image processing started' }
}

// Destination endpoint (receives message from QStash)
async function processImageEndpoint(req: Request) {
  // Verify QStash signature
  const verified = await verifyQStashSignature(req)
  if (!verified) return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const { imageUrl, userId, operations } = await req.json()

  // Process image (can take 10-30 seconds)
  const processed = await processImage(imageUrl, operations)

  // Store result
  await db.images.create({
    data: {
      userId,
      originalUrl: imageUrl,
      processedUrl: processed.url,
      thumbnailUrl: processed.thumbnail,
    },
  })

  return Response.json({ success: true })
}
```

❌ **BAD: Blocking user request with long task**

```typescript
// PROBLEM: User waits 30 seconds for image processing
async function handleImageUpload(imageUrl: string, userId: string) {
  // ❌ User's upload request blocks for 30+ seconds
  const processed = await processImage(imageUrl, ['resize', 'compress'])

  await db.images.create({
    data: { userId, url: processed.url },
  })

  return { success: true }
}
```

### Email Sending

✅ **GOOD: Async transactional emails**

```typescript
async function sendWelcomeEmail(email: string, name: string) {
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/send-email`,
    body: {
      to: email,
      template: 'welcome',
      data: { name },
    },
    retries: 5, // Email critical - retry more
  })
}

// Email endpoint
async function sendEmailEndpoint(req: Request) {
  const verified = await verifyQStashSignature(req)
  if (!verified) return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const { to, template, data } = await req.json()

  // Send email (can fail due to provider issues)
  await emailProvider.send({
    to,
    template,
    data,
  })

  return Response.json({ success: true })
}
```

### Webhook Delivery

✅ **GOOD: Reliable webhook with retry**

```typescript
async function notifyPartners(eventType: string, payload: object) {
  // Deliver to multiple partner webhooks
  await qstash.publishJSON({
    url: 'https://partner-api.com/webhooks',
    body: {
      event: eventType,
      data: payload,
      timestamp: Date.now(),
    },
    retries: 3,
    headers: {
      'X-API-Key': process.env.PARTNER_API_KEY!,
    },
  })
}
```

**Real-World Background Job Use Cases** (2025):
- Image/video processing (resize, compress, transcode)
- Email sending (transactional, marketing)
- PDF generation (reports, invoices)
- Webhook delivery (external integrations)
- Data export (CSV, Excel)
- Third-party API calls (analytics, CRM)

### Batch Publishing (Bulk Operations)

✅ **GOOD: Batch publish multiple messages efficiently**

```typescript
// Send emails to 1000 users efficiently
async function sendBulkEmails(userEmails: string[]) {
  // Option 1: Use batchPublishJSON for better performance
  const messages = userEmails.map(email => ({
    url: `${process.env.API_URL}/api/send-email`,
    body: { email, template: 'weekly-digest' },
    retries: 3,
  }))

  await qstash.batch(messages)
}

// Batch with custom delays
async function sendProgressiveNotifications(userIds: string[]) {
  const now = Math.floor(Date.now() / 1000)

  const messages = userIds.map((userId, index) => ({
    url: `${process.env.API_URL}/api/notify`,
    body: { userId, message: 'Check your account' },
    notBefore: now + (index * 3600), // Stagger by 1 hour each
    retries: 5,
  }))

  await qstash.batch(messages)
}
```

❌ **BAD: Individual publishes in loop (slower)**

```typescript
// ❌ N+1 API calls to QStash
async function sendBulkEmails(userEmails: string[]) {
  for (const email of userEmails) {
    // Each iteration = separate API call
    await qstash.publishJSON({
      url: `${process.env.API_URL}/api/send-email`,
      body: { email },
    })
  }
}

// ✅ BETTER: Batch all at once
async function sendBulkEmails(userEmails: string[]) {
  const messages = userEmails.map(email => ({
    url: `${process.env.API_URL}/api/send-email`,
    body: { email },
  }))

  await qstash.batch(messages) // Single API call
}
```

---

## Scheduled Messages & Cron Jobs

Schedule messages for future delivery or recurring execution.

### Future Delivery (Delayed Messages)

✅ **GOOD: Send message at specific time**

```typescript
// Send reminder email 24 hours after signup
async function scheduleWelcomeReminder(email: string, userId: string) {
  const in24Hours = Math.floor(Date.now() / 1000) + 86400 // Unix timestamp

  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/send-reminder`,
    body: { email, userId, type: 'welcome' },
    notBefore: in24Hours, // Deliver at this timestamp
  })
}

// Alternative: Delay in seconds
async function sendDelayedNotification(userId: string, message: string) {
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/notify`,
    body: { userId, message },
    delay: 3600, // Deliver in 1 hour
  })
}
```

### Recurring Tasks (Cron Jobs)

✅ **GOOD: Scheduled cron with proper timezone**

```typescript
import { Client } from '@upstash/qstash'

const qstash = new Client({ token: process.env.QSTASH_TOKEN! })

// Create daily cleanup job (runs at midnight UTC)
async function setupDailyCleanup() {
  await qstash.schedules.create({
    destination: `${process.env.API_URL}/api/cleanup`,
    cron: '0 0 * * *', // Every day at midnight
  })
}

// Monthly billing reset (1st of month at 00:00 UTC)
async function setupMonthlyBilling() {
  await qstash.schedules.create({
    destination: `${process.env.API_URL}/api/billing-reset`,
    cron: '0 0 1 * *', // 1st of month
  })
}

// Hourly report generation
async function setupHourlyReports() {
  await qstash.schedules.create({
    destination: `${process.env.API_URL}/api/generate-report`,
    cron: '0 * * * *', // Every hour at :00
    body: JSON.stringify({ type: 'hourly' }),
  })
}

// List all schedules
async function listSchedules() {
  const schedules = await qstash.schedules.list()
  return schedules
}

// Delete schedule
async function deleteSchedule(scheduleId: string) {
  await qstash.schedules.delete(scheduleId)
}
```

❌ **BAD: No error handling for cron failures**

```typescript
// PROBLEM: Cron endpoint fails but no monitoring/alerts
async function cleanupEndpoint(req: Request) {
  // ❌ If this throws, cron shows as "failed" in QStash dashboard
  // but no notification/alert to developers
  await db.sessions.deleteMany({
    where: { expiresAt: { lt: new Date() } }
  })

  return Response.json({ success: true })
}

// ✅ BETTER: Add error handling and monitoring
async function cleanupEndpoint(req: Request) {
  try {
    const deleted = await db.sessions.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    })

    // Log success
    console.log(`Cleanup: Deleted ${deleted.count} expired sessions`)

    return Response.json({ success: true, deleted: deleted.count })
  } catch (error) {
    // Log error for monitoring
    console.error('Cleanup failed:', error)

    // Send alert (Sentry, Slack, etc.)
    await alertDevelopers('Daily cleanup failed', error)

    // Return error (QStash will retry)
    return Response.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
```

**Cron Syntax Quick Reference**:
- `0 0 * * *` - Daily at midnight
- `0 0 * * 0` - Weekly (Sunday midnight)
- `0 0 1 * *` - Monthly (1st at midnight)
- `*/15 * * * *` - Every 15 minutes
- `0 9 * * 1-5` - Weekdays at 9 AM

**Real-World Cron Use Cases** (2025):
- Database cleanup (delete old records)
- Billing resets (monthly credit refresh)
- Report generation (daily analytics)
- Data sync (hourly CRM updates)
- Health checks (monitor external services)
- Backup jobs (nightly database dumps)

---

## Message Queues (FIFO)

Use queues when message order matters or you need to control parallelism.

### FIFO Queue with Parallelism Control

✅ **GOOD: Sequential processing with rate limiting**

```typescript
// Create queue
const queue = qstash.queue({ queueName: 'order-processing' })

// Enqueue messages (processed in order)
async function enqueueOrder(orderId: string) {
  await queue.enqueueJSON({
    url: `${process.env.API_URL}/api/process-order`,
    body: { orderId },
  })
}

// Configure queue parallelism and rate limiting
await qstash.queue({
  queueName: 'order-processing',
}).upsert({
  parallelism: 5, // Process up to 5 orders concurrently
  rateLimit: 10, // Maximum 10 messages per second
})
```

### Rate Limiting Per Queue

✅ **GOOD: Prevent overwhelming downstream API**

```typescript
// Limit queue to 10 messages per second
await qstash.queue({ queueName: 'external-api' }).upsert({
  parallelism: 10,
  // Additional rate limiting can be configured in QStash dashboard
})

// Enqueue API calls
async function callExternalAPI(data: object) {
  await qstash.queue({ queueName: 'external-api' }).enqueueJSON({
    url: 'https://external-api.com/endpoint',
    body: data,
    headers: {
      'Authorization': `Bearer ${process.env.EXTERNAL_API_KEY}`,
    },
  })
}
```

❌ **BAD: No rate limiting (overwhelming endpoint)**

```typescript
// PROBLEM: 1000 concurrent requests to external API → rate limited or banned
async function processAll(items: object[]) {
  // ❌ All 1000 messages sent immediately without queue
  await Promise.all(
    items.map(item =>
      qstash.publishJSON({
        url: 'https://external-api.com/endpoint',
        body: item,
      })
    )
  )
}

// ✅ BETTER: Use queue with controlled parallelism
async function processAll(items: object[]) {
  const queue = qstash.queue({ queueName: 'external-api' })

  for (const item of items) {
    await queue.enqueueJSON({
      url: 'https://external-api.com/endpoint',
      body: item,
    })
  }
}
```

**Queue Use Cases**:
- Order processing (FIFO, ensure correct order)
- Email campaigns (rate limit to avoid spam flags)
- External API calls (respect rate limits)
- Video transcoding (limit concurrent jobs)
- Database migrations (sequential, avoid conflicts)

**Parallelism Recommendations** (2025):
- **Rate-limited APIs**: 1-5 (respect provider limits)
- **Internal services**: 10-50 (optimize throughput)
- **Expensive operations**: 1-10 (limit resource usage)
- **FIFO critical**: 1 (strict ordering required)

---

## Delayed Messages

Send messages with configurable delays for progressive notifications or retry strategies.

✅ **GOOD: Progressive notification system**

```typescript
// Send reminder 10 minutes after cart abandonment
async function scheduleCartReminder(cartId: string, email: string) {
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/send-cart-reminder`,
    body: { cartId, email, reminderType: 'first' },
    delay: 600, // 10 minutes
  })
}

// Follow-up reminder after 24 hours if cart still abandoned
async function scheduleFollowUpReminder(cartId: string, email: string) {
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/send-cart-reminder`,
    body: { cartId, email, reminderType: 'followup' },
    delay: 86400, // 24 hours
  })
}
```

✅ **GOOD: Retry with progressive delays**

```typescript
// Payment failed - retry after 1 hour, 1 day, 1 week
async function retryFailedPayment(
  paymentId: string,
  attempt: number
) {
  const delays = {
    1: 3600,    // 1 hour
    2: 86400,   // 1 day
    3: 604800,  // 1 week
  }

  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/retry-payment`,
    body: { paymentId, attempt },
    delay: delays[attempt as keyof typeof delays],
  })
}
```

❌ **BAD: No delay when timing matters**

```typescript
// PROBLEM: Welcome email sent immediately after signup
// Better UX: Wait 10 minutes to let user explore first
async function sendWelcomeEmail(email: string) {
  // ❌ Immediate delivery feels spammy
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/send-email`,
    body: { to: email, template: 'welcome' },
  })
}

// ✅ BETTER: Delay for better timing
async function sendWelcomeEmail(email: string) {
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/send-email`,
    body: { to: email, template: 'welcome' },
    delay: 600, // 10 minutes - better user experience
  })
}
```

**Delay Use Cases** (2025):
- Cart abandonment: 10 min, 1 day, 3 days
- Welcome sequences: 10 min, 1 day, 1 week
- Payment retries: 1 hour, 1 day, 1 week
- Trial expiration: 3 days before, 1 day before, expiration day
- Onboarding: Day 1, Day 3, Day 7, Day 30

---

## Fan-Out & URL Groups

Publish a single message to multiple endpoints in parallel for redundancy or multi-channel notifications.

✅ **GOOD: Multi-channel notifications (fan-out)**

```typescript
// Create URL group for notifications
await qstash.urlGroups.upsert({
  name: 'notifications',
  endpoints: [
    { url: `${process.env.API_URL}/api/notify-slack` },
    { url: `${process.env.API_URL}/api/notify-email` },
    { url: `${process.env.API_URL}/api/notify-sms` },
  ],
})

// Send to all channels in parallel
async function notifyAllChannels(message: string, userId: string) {
  await qstash.publishJSON({
    urlGroup: 'notifications',
    body: { message, userId },
  })
}

// Each endpoint receives the same message
async function notifySlackEndpoint(req: Request) {
  const { message, userId } = await req.json()
  await slack.sendMessage({ text: message, userId })
  return Response.json({ success: true })
}

async function notifyEmailEndpoint(req: Request) {
  const { message, userId } = await req.json()
  const user = await db.users.findUnique({ where: { id: userId } })
  await emailProvider.send({ to: user.email, body: message })
  return Response.json({ success: true })
}
```

✅ **GOOD: Failure isolation (one endpoint fails, others succeed)**

```typescript
// If Slack endpoint fails, email and SMS still succeed
await qstash.publishJSON({
  urlGroup: 'notifications',
  body: { message: 'Payment received' },
  retries: 3, // Each endpoint retries independently
})
```

❌ **BAD: Sequential fan-out (slow)**

```typescript
// PROBLEM: 3 notifications sent sequentially (300ms total)
async function notifyAllChannels(message: string, userId: string) {
  // ❌ Sequential - 100ms each = 300ms total
  await notifySlack(message, userId)
  await notifyEmail(message, userId)
  await notifySMS(message, userId)
}

// ✅ BETTER: Parallel with URL group (100ms total)
await qstash.publishJSON({
  urlGroup: 'notifications',
  body: { message, userId },
})
```

**URL Group Use Cases**:
- Multi-channel alerts (Slack + email + SMS)
- Data replication (sync to multiple services)
- Backup webhooks (primary + fallback)
- Analytics (send to multiple tracking services)

---

## Callbacks & Response Handling

Receive responses from message processing asynchronously.

✅ **GOOD: Callback URL for completion tracking**

```typescript
// Send message with callback
await qstash.publishJSON({
  url: `${process.env.API_URL}/api/process-data`,
  body: { dataId: '123' },
  callback: `${process.env.API_URL}/api/callback`,
})

// Callback endpoint receives response
async function callbackEndpoint(req: Request) {
  const verified = await verifyQStashSignature(req)
  if (!verified) return Response.json({ error: 'Invalid signature' }, { status: 401 })

  const response = await req.json()

  // Track completion
  await db.jobs.update({
    where: { id: response.messageId },
    data: {
      status: response.status, // 'success' or 'error'
      completedAt: new Date(),
    },
  })

  return Response.json({ success: true })
}
```

❌ **BAD: Polling for completion**

```typescript
// PROBLEM: Inefficient polling every 5 seconds
async function waitForCompletion(jobId: string) {
  // ❌ Wastes resources polling
  while (true) {
    const job = await db.jobs.findUnique({ where: { id: jobId } })
    if (job.status === 'completed') return job
    await sleep(5000)
  }
}

// ✅ BETTER: Use callback to receive completion event
await qstash.publishJSON({
  url: `${process.env.API_URL}/api/process`,
  body: { jobId },
  callback: `${process.env.API_URL}/api/job-complete`,
})
```

---

## Retry Strategies & Error Handling

QStash automatically retries failed messages with exponential backoff.

✅ **GOOD: Retry with backoff and DLQ monitoring**

```typescript
// Configure retry strategy per message
async function publishWithRetry(url: string, body: object, critical = false) {
  await qstash.publishJSON({
    url,
    body,
    retries: critical ? 10 : 3, // More retries for critical operations
  })
}

// Idempotent endpoint (safe to retry)
async function processOrderEndpoint(req: Request) {
  const { orderId } = await req.json()

  // ✅ Check if already processed (idempotent)
  const existing = await db.orders.findUnique({ where: { id: orderId } })
  if (existing?.status === 'processed') {
    return Response.json({ success: true, message: 'Already processed' })
  }

  // Process order
  await db.orders.update({
    where: { id: orderId },
    data: { status: 'processed' },
  })

  return Response.json({ success: true })
}
```

✅ **GOOD: DLQ monitoring and recovery**

```typescript
// Periodically check DLQ for failed messages
async function checkDLQ() {
  const dlq = await qstash.dlq.listMessages()

  if (dlq.messages.length > 0) {
    // Alert developers
    await alertDevelopers(`${dlq.messages.length} messages in DLQ`)

    // Optionally retry or process manually
    for (const message of dlq.messages) {
      console.log('Failed message:', message)

      // Retry if appropriate
      if (shouldRetry(message)) {
        await qstash.dlq.retry(message.id)
      } else {
        // Remove from DLQ (manual intervention needed)
        await qstash.dlq.delete(message.id)
      }
    }
  }
}
```

❌ **BAD: Infinite retries, no DLQ**

```typescript
// PROBLEM: Message fails forever, no DLQ
await qstash.publishJSON({
  url: 'https://broken-endpoint.com/webhook',
  body: { data: 'important' },
  retries: 999, // ❌ Retries forever, wastes resources
})

// ✅ BETTER: Reasonable retry limit + DLQ
await qstash.publishJSON({
  url: 'https://broken-endpoint.com/webhook',
  body: { data: 'important' },
  retries: 5, // After 5 retries → DLQ
})
```

### Deduplication

✅ **GOOD: Prevent duplicate processing**

```typescript
// Use deduplication ID to prevent duplicate messages
async function sendUniqueNotification(userId: string, event: string) {
  await qstash.publishJSON({
    url: `${process.env.API_URL}/api/notify`,
    body: { userId, event },
    deduplicationId: `${userId}:${event}:${Date.now()}`, // Unique per event
  })
}

// Endpoint is idempotent (safe even if duplicates)
async function notifyEndpoint(req: Request) {
  const { userId, event } = await req.json()

  // Check if already notified
  const exists = await db.notifications.findFirst({
    where: { userId, event, createdAt: { gte: new Date(Date.now() - 3600000) } }
  })

  if (exists) {
    return Response.json({ success: true, message: 'Already notified' })
  }

  // Send notification
  await sendNotification(userId, event)

  // Record notification
  await db.notifications.create({
    data: { userId, event },
  })

  return Response.json({ success: true })
}
```

**Retry Limits Recommendations** (2025):
- **Non-critical**: 3-5 retries (emails, notifications)
- **Critical**: 10+ retries (payments, order processing)
- **External APIs**: 3 retries (respect provider limits)

**Backoff Strategy**: Exponential using `delay = min(86400, e^(2.5*n))` → 12s, 2m28s, 30m8s, 6h7m, 24h
- Custom delays supported via `retryDelay` expressions (e.g., `pow(2, retried) * 1000`)

---

## Security & Reliability

### Message Signing (Signature Verification)

✅ **GOOD: Verify QStash signatures**

```typescript
import { Receiver } from '@upstash/qstash'

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

async function verifyQStashSignature(req: Request): Promise<boolean> {
  const signature = req.headers.get('Upstash-Signature')
  if (!signature) return false

  const body = await req.text()

  try {
    await receiver.verify({
      signature,
      body,
    })
    return true
  } catch (error) {
    console.error('Invalid QStash signature:', error)
    return false
  }
}

// Use in endpoint
async function qstashEndpoint(req: Request) {
  const verified = await verifyQStashSignature(req)
  if (!verified) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Process message
  const data = JSON.parse(await req.text())
  // ...
}
```

❌ **BAD: No signature verification**

```typescript
// PROBLEM: Anyone can spoof messages to your endpoint
async function qstashEndpoint(req: Request) {
  // ❌ No signature verification - vulnerable to spoofing!
  const data = await req.json()

  // Attacker can send fake messages
  // Could trigger unauthorized actions
}
```

### Idempotent Handlers

✅ **GOOD: Idempotent message processing**

```typescript
// Safe to process multiple times (at-least-once delivery)
async function processPaymentEndpoint(req: Request) {
  const { paymentId } = await req.json()

  // Check if already processed
  const payment = await db.payments.findUnique({ where: { id: paymentId } })
  if (payment?.status === 'completed') {
    return Response.json({ success: true, message: 'Already processed' })
  }

  // Process payment (idempotent)
  await stripeClient.charges.create({
    amount: payment.amount,
    currency: 'usd',
    idempotencyKey: paymentId, // Stripe ensures idempotency
  })

  // Update status
  await db.payments.update({
    where: { id: paymentId },
    data: { status: 'completed' },
  })

  return Response.json({ success: true })
}
```

**Security Checklist**:
- [ ] Verify QStash signatures on all endpoints
- [ ] Use HTTPS for all destination URLs
- [ ] Implement idempotent handlers
- [ ] Store sensitive data encrypted
- [ ] Rate limit endpoints (prevent abuse)

---

## Quick Checklist

Before deploying QStash to production:

- [ ] Retry strategy defined (max retries, backoff)
- [ ] DLQ monitoring configured (alert at >1%)
- [ ] Message signatures verified on all endpoints
- [ ] Idempotent handlers (handle duplicates gracefully)
- [ ] Proper queue parallelism limits (1-50 based on use case)
- [ ] Error handling for all message types
- [ ] Cost-aware batch operations (batch when possible)
- [ ] Monitoring delivery metrics (latency, error rate)
- [ ] Cron jobs have error handling and alerts
- [ ] Using callbacks instead of polling
- [ ] HTTPS for all destination URLs
- [ ] Appropriate delays for user experience

---

## Real-World Reference Numbers (2025)

**Retry Limits**:
- Non-critical: 3-5 retries
- Critical: 10+ retries
- External APIs: 3 retries (respect limits)

**Backoff Strategy**:
- Default formula: `delay = min(86400, e^(2.5*n))` → 12s, 2m28s, 30m8s, 6h7m, 24h
- Custom delays: Use `retryDelay` expressions for custom backoff patterns
- Max delay: 24 hours (86400 seconds)

**Queue Parallelism**:
- Rate-limited APIs: 1-5
- Internal services: 10-50
- Expensive operations: 1-10
- FIFO critical: 1

**DLQ Threshold**:
- Alert if >1% messages in DLQ
- Investigate endpoint if >5% error rate

**Delays for UX**:
- Cart abandonment: 10 min, 1 day, 3 days
- Welcome emails: 10 min (let user explore first)
- Payment retries: 1 hour, 1 day, 1 week
- Trial expiration: 3 days, 1 day, expiration day

**Industry References**:
- [Upstash QStash Documentation](https://upstash.com/docs/qstash)
- Serverless background job best practices (2025)
