---
name: rate-limiting
description: Comprehensive rate limiting patterns for SaaS applications (AI and non-AI). Use when implementing rate limits, protecting APIs from abuse, or designing tier-based access control.
---

# Rate Limiting Best Practices for SaaS

> **📚 Documentation Note**: This skill combines Upstash-verified patterns with industry best practices. Specific rate limit numbers (e.g., "5-60 req/min for AI SaaS") and credit-based billing patterns are **architecture recommendations** based on 2025 industry standards, not Upstash documentation.

## Core Principle: Why Rate Limit?

Rate limiting serves **different purposes** depending on your billing model:

| Billing Model | Primary Goal | What to Limit |
|--------------|--------------|---------------|
| **Credit-based (AI SaaS)** | Infrastructure protection | **Requests/min** (prevent DoS, manage concurrency) |
| **Usage-based (metered)** | Cost control | **Tokens, API calls, data volume** |
| **Seat-based (traditional)** | Fair access | **Requests/min per user** |

For **Prophet** (credit-based AI SaaS): Users pay for what they consume via credits. Rate limiting protects infrastructure, not revenue.

---

## The Two-Layer Approach for AI SaaS

AI applications require **two separate throttles**:

### Layer 1: Request-Rate Limits (Infrastructure Protection)
```typescript
// Protects your servers from DoS, manages streaming concurrency
const chatLimits = {
  free: { requests: 5, window: '1 m' },
  pro: { requests: 20, window: '1 m' },
  premium: { requests: 60, window: '1 m' },
  ultra: { requests: 60, window: '1 m' },
}
```

**Why?** A single user could send 1000 concurrent requests and crash your server, even if they have credits.

### Layer 2: Credit Limits (Budget Protection)
```typescript
// Implemented via pre-paid balance in database
await db.transaction(async tx => {
  const user = await tx.query.users.findFirst({ where: eq(users.id, userId) })

  if (user.creditsRemaining < estimatedCost) {
    throw new Error('Insufficient balance')
  }

  // Process AI request
  const response = await anthropic.messages.stream({ ... })

  // Deduct actual cost atomically
  await tx.update(users)
    .set({ creditsRemaining: sql`${users.creditsRemaining} - ${actualCost}` })
    .where(eq(users.id, userId))
})
```

**Why?** Prevents users from draining their entire balance in 10 seconds due to a buggy script.

---

## Algorithm Choice: Sliding Window

**Use sliding window** for most SaaS applications:

```typescript
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:chat:free',
  timeout: 5000, // Default is 5 seconds
})
```

### Why Sliding Window?
- **Smooth traffic** - No "thundering herd" at window reset
- **Accurate** - Prevents burst abuse at window boundaries
- **Standard** - What most SaaS companies use in 2025

### Alternatives (When to Use)
- **Token bucket** - If you want to allow short bursts (e.g., 20 requests in 10s, then throttle)
  ```typescript
  // tokenBucket(refillRate, interval, maxTokens)
  limiter: Ratelimit.tokenBucket(5, '10 s', 10) // 5 tokens refill per 10s, max 10 tokens
  // This allows burst of 10 requests initially, then 5 per 10s sustained
  ```
- **Fixed window** - Very cheap and simple; use when precision doesn't matter (e.g., analytics, logging)
  ```typescript
  limiter: Ratelimit.fixedWindow(100, '1 m') // Resets every minute
  ```
  **Note**: Fixed window allows burst attacks at window boundaries (2× limit possible)

---

## Tier-Based Rate Limiting

### Pattern: Multiple Limiter Instances

```typescript
// Define limits per tier
const chatLimits = {
  free: { requests: 5, window: '1 m' },
  pro: { requests: 20, window: '1 m' },
  premium: { requests: 60, window: '1 m' },
  ultra: { requests: 60, window: '1 m' },
} as const

// Create separate limiters with unique prefixes
export const chatRatelimits = redis ? {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(chatLimits.free.requests, chatLimits.free.window),
    analytics: true,
    prefix: 'ratelimit:chat:free',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(chatLimits.pro.requests, chatLimits.pro.window),
    analytics: true,
    prefix: 'ratelimit:chat:pro',
  }),
  // ... premium, ultra
} : null

// Dynamic tier lookup in API route
export async function checkRateLimit(userId: string, type: 'chat' | 'api') {
  const limiters = type === 'chat' ? chatRatelimits : apiRatelimits
  if (!limiters) return { success: true }

  // Fetch user tier from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { tier: true },
  })

  const tier = user?.tier ?? 'free'
  const limiter = limiters[tier]

  return await limiter.limit(userId)
}
```

**Key Insight**: Upstash doesn't have built-in tier switching. You must:
1. Create separate `Ratelimit` instances per tier
2. Look up user tier in your code
3. Call the appropriate limiter

---

## Global Burst Protection

Prevent runaway scripts from exhausting your entire server pool:

```typescript
export const globalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(500, '1 m'), // 500 req/min across ALL users
      analytics: true,
      prefix: 'ratelimit:global',
    })
  : null

export async function checkRateLimit(userId: string, type: 'chat' | 'api') {
  // Check global limit FIRST
  if (globalRatelimit) {
    const globalCheck = await globalRatelimit.limit('global')
    if (!globalCheck.success) {
      return { success: false, ...globalCheck }
    }
  }

  // Then check per-user tier limit
  // ...
}
```

**When to add**: After ~1000 concurrent users or if you experience server overload events.

**Before that**: You'll see abuse in dashboards/logs before it becomes critical.

---

## Endpoint-Specific Limits

Different endpoints have different costs:

```typescript
// Heavy: Streaming AI responses
const chatLimits = {
  free: 5,    // Very restrictive
  pro: 20,
  premium: 60,
}

// Medium: Message creation, auto-titling
const apiLimits = {
  free: 15,   // More generous
  pro: 60,
  premium: 120,
}

// Light: Authentication, user info
const authLimits = {
  free: 100,  // Very high
  pro: 100,
  premium: 100,
}
```

**Rule of thumb**:
- AI streaming: 5-30 req/min
- Standard API: 30-120 req/min
- Lightweight: 100-1000 req/min

---

## Response Headers (Required for Good UX)

Always return rate limit info to clients:

```typescript
const rateLimitResult = await checkRateLimit(userId, 'chat')

if (!rateLimitResult.success) {
  return NextResponse.json(
    { error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimitResult.reset! - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(rateLimitResult.limit ?? 0),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? 0),
        'X-RateLimit-Reset': String(rateLimitResult.reset ?? 0),
      }
    }
  )
}
```

**Why?** Clients can:
- Show "Try again in 42 seconds"
- Display "3 requests remaining"
- Implement exponential backoff

### Understanding Limit Response Fields

The `rateLimitResult` object includes:

```typescript
type RateLimitResponse = {
  success: boolean
  limit: number              // Requests per window
  remaining: number          // Requests left
  reset: number             // Millisecond timestamp when limit resets
  pending: Promise<void>    // Serverless: await before returning
  reason?: string           // Why the request was limited
}

// reason can be:
// - "timeout": Redis timed out (default is allow)
// - "cacheBlock": Request blocked by ephemeralCache
// - "denyList": IP/user on deny list (if using Traffic Protection)
// - undefined: Normal sliding window limit exceeded

const result = await ratelimit.limit(userId)

if (!result.success) {
  console.log(`Blocked: ${result.reason}`)
  // "Blocked: timeout" → Redis unavailable, request allowed
  // "Blocked: cacheBlock" → Cached as blocked (fast rejection)
  // "Blocked: denyList" → Manual deny list
  // "Blocked: undefined" → Rate limit exceeded
}
```

---

## Generic SaaS vs AI SaaS Patterns

### Generic SaaS (2025 Standard)
| Dimension | Pattern |
|-----------|---------|
| **Who gets limited** | Per-API-key (B2B) or per-user-id (B2C) |
| **Algorithm** | Sliding window (most common) |
| **Time window** | 1 min (human-facing) or 1 hour (background) |
| **Granularity** | Tiered: Free ≈ 60 req/min, Pro ≈ 300 req/min |
| **Storage** | Redis (stateless, horizontally scalable) |
| **Where enforced** | API gateway (Kong, Cloudflare) + service-level |

### AI SaaS (Additional Considerations)
| Problem | Generic SaaS | AI SaaS Twist |
|---------|--------------|---------------|
| **Cost driver** | CPU/DB time | **Tokens → real money** |
| **Burst profile** | Even load | **Huge prompts** (50K tokens in 1 call) |
| **User expectation** | "Don't 429 me" | "Let me burn credits fast if I want" |

**AI-specific pattern**: Layer request limits (infrastructure) + credit limits (wallet).

---

## When to Optimize Further

Don't build these until you have **data** showing they're needed:

| Optimization | When to Add | Why Wait |
|--------------|-------------|----------|
| **Token-per-minute limits** | Users routinely hit credit limits in <10s | Your credit system already caps this |
| **Per-endpoint fine-tuning** | You have 5+ different endpoints with vastly different costs | You only have 1-2 endpoints now |
| **Redis cost tracking** | Postgres queries for tier lookup are slow (>100ms p95) | Current DB lookup is <10ms |
| **Dynamic limit lifting** | Server load consistently <30% but users hit limits | Server utilization is low anyway |
| **Global burst protection** | <1000 users | ✅ Add this early - it's only 5 lines |

**The Rule**: Optimize when you have 1000+ concurrent users OR actual abuse incidents. Before that, focus on features.

---

## Testing Rate Limits

```typescript
// Test helper
async function testRateLimit(userId: string, count: number) {
  const results = []
  for (let i = 0; i < count; i++) {
    const result = await checkRateLimit(userId, 'chat')
    results.push(result.success)
  }
  return results
}

// Test free tier limit (5 req/min)
const freeUserResults = await testRateLimit('free-user-id', 10)
// Expected: [true, true, true, true, true, false, false, false, false, false]

// Test tier upgrade works
await db.update(users).set({ tier: 'pro' }).where(eq(users.id, 'user-id'))
const proUserResults = await testRateLimit('user-id', 25)
// Expected: 20 trues, 5 falses
```

---

## Graceful Degradation

Handle missing Redis gracefully:

```typescript
const redis = process.env.UPSTASH_REDIS_REST_URL ? new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
}) : null

export const chatRatelimits = redis ? {
  free: new Ratelimit({ ... }),
  // ...
} : null

export async function checkRateLimit(userId: string, type: 'chat' | 'api') {
  const limiters = type === 'chat' ? chatRatelimits : apiRatelimits

  if (!limiters) {
    // Rate limiting disabled - allow all requests (dev mode)
    return { success: true }
  }

  // ...
}
```

**Why?** Developers can work locally without Redis. Production always has Redis.

---

## Advanced Upstash Features

### Timeout Configuration
**Default**: 5 seconds (5000ms)

```typescript
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  timeout: 10000, // Wait up to 10 seconds for Redis response
})
```

**When to adjust**:
- **Increase** (10-30s) for critical operations where you must enforce limits
- **Decrease** (1-3s) for real-time APIs where fast failure is better than waiting

### Ephemeral Cache (Serverless Optimization)
Reduces Redis calls by caching blocked identifiers in-memory:

```typescript
// Default: ephemeralCache enabled with new Map()
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  // ephemeralCache is automatically initialized with new Map() by default
})

// Disable ephemeral cache if needed
const ratelimitNoCache = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  ephemeralCache: false, // Disable in-memory cache
})
```

**How it works**:
- When a user is **blocked**, the identifier is cached until the reset time
- Subsequent requests from that user **skip Redis** (instant rejection)
- Once reset time passes, cache entry expires and Redis is checked again

**Benefits**:
- Reduces Redis costs for high-traffic apps
- Faster rejection of blocked users (no network call)
- Default behavior: enabled automatically (no need to pass ephemeralCache)

**Important**: Only stores **blocked** identifiers, not all requests. Cache is per-instance (doesn't survive cold starts in serverless).

### Pending Promises (Serverless Required)
For Cloudflare Workers, Vercel Edge, etc.:

```typescript
const { success, pending } = await ratelimit.limit(userId)

if (!success) {
  // IMPORTANT: Must await pending before returning
  await pending
  return Response.json({ error: "Rate limited" }, { status: 429 })
}

// Also await pending on success for accurate analytics
await pending
```

**Why?** Serverless environments kill execution after response. The `pending` promise ensures state is saved to Redis before termination.

---

## Frontend Error Handling

### Backend (API Route)
```typescript
const rateLimitResult = await checkRateLimit(userId, 'chat')

if (!rateLimitResult.success) {
  return NextResponse.json(
    {
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimitResult.reset! - Date.now()) / 1000)),
        'X-RateLimit-Limit': String(rateLimitResult.limit ?? 0),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining ?? 0),
      }
    }
  )
}
```

### Frontend (Error Display)
```typescript
// Parse error response
const response = await fetch('/api/chat/stream', { ... })

if (!response.ok) {
  const errorData = await response.json()

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After')
    const remaining = response.headers.get('X-RateLimit-Remaining')

    setError(`Rate limit exceeded. Try again in ${retryAfter} seconds. (${remaining} requests remaining)`)
  } else {
    setError(errorData.error || 'Request failed')
  }
}
```

---

## Anti-Patterns to Avoid

- ❌ Rate limiting by IP address (doesn't work for authenticated SaaS)
- ❌ Same limits for all tiers (paying users should get better service)
- ❌ No global burst protection (one script can DOS entire server)
- ❌ Missing response headers (clients can't implement backoff)
- ❌ Generic "HTTP 429" errors (tell users WHEN to retry)
- ❌ Rate limiting before authentication (wastes resources on unauthenticated requests)
- ❌ Fixed window algorithm (allows burst attacks at window boundaries)
- ❌ Rate limiting without analytics (can't debug or optimize)

---

## Quick Checklist

When implementing rate limiting:

- [ ] Use **sliding window** algorithm (not fixed window)
- [ ] Rate limit by **userId** (not IP)
- [ ] **Tier-based limits** for different subscription levels
- [ ] **Global burst protection** for 1000+ users
- [ ] Return proper **response headers** (Retry-After, X-RateLimit-*)
- [ ] **Graceful degradation** when Redis unavailable
- [ ] **Analytics enabled** for monitoring
- [ ] **Unique prefixes** per limiter to avoid collisions
- [ ] **Separate limits** for expensive vs cheap endpoints
- [ ] **Error messages** tell users when to retry

---

## Real-World Reference Numbers (2025)

> **Note**: These are **industry-observed recommendations** from analyzing OpenAI, Anthropic, Stripe, GitHub, and other major SaaS providers. Adjust based on your specific use case.

### Generic SaaS
- **Free tier**: 60 req/min
- **Pro tier**: 300 req/min
- **Enterprise**: "Contact us" (often 1000+ req/min)

### AI SaaS (Chat/Completions)
- **Free tier**: 5-10 req/min
- **Pro tier**: 20-30 req/min
- **Premium/Ultra**: 60-100 req/min

### Time Windows
- **Human-facing APIs**: 1 minute
- **Background jobs**: 1 hour or 1 day
- **WebSocket/Streaming**: Per-connection limits (e.g., 10 concurrent streams)

### Storage
- **Redis** is the de-facto standard (stateless, fast, horizontally scalable)
- **In-memory** only for single-region, low-scale apps
- **Never database-based** (too slow, doesn't scale)
