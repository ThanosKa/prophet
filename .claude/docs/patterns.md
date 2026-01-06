# Key Patterns

Common implementation patterns used throughout Prophet.

## Authentication Flow

Backend API route authentication with Clerk:

```typescript
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) return Response.json({ error: "Not found" }, { status: 404 });
}
```

### Key Points

- Always call `auth()` first to get `userId`
- Return 401 for unauthenticated requests
- Verify resource ownership before operations
- Return 404 for resources not found or not owned

## Streaming AI Response

Backend API streaming pattern with Anthropic:

```typescript
const stream = await anthropic.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages: [...],
})

// Track tokens after completion
stream.on('finalMessage', async (message) => {
  const totalTokens = message.usage.input_tokens + message.usage.output_tokens

  await db.transaction(async tx => {
    await tx.update(users)
      .set({ creditsRemaining: sql`${users.creditsRemaining} - ${totalTokens}` })
      .where(eq(users.id, userId))
  })
})

return new Response(stream.toReadableStream(), {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

### Key Points

- Use `anthropic.messages.stream()` for streaming responses
- Listen to `finalMessage` event for usage tracking
- Deduct credits in a database transaction
- Return stream with proper Content-Type header
- Never expose `ANTHROPIC_API_KEY` to client

## Rate Limiting

Tier-based rate limiting with Upstash Redis:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

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

// Global burst protection (500 req/min across ALL users)
export const globalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(500, '1 m'),
      analytics: true,
      prefix: 'ratelimit:global',
    })
  : null

// Dynamic tier lookup and rate limit check
export async function checkRateLimit(userId: string, type: 'chat' | 'api') {
  // Check global limit FIRST
  if (globalRatelimit) {
    const globalCheck = await globalRatelimit.limit('global')
    if (!globalCheck.success) {
      return { success: false, ...globalCheck }
    }
  }

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

### API Route Usage

```typescript
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const rateLimitResult = await checkRateLimit(userId, 'chat')

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.', code: 'RATE_LIMIT_EXCEEDED' },
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

  // Process request...
}
```

### Key Points

- Use **sliding window** algorithm (smooth traffic, prevents burst attacks)
- **Tier-based limits** for differentiated service (Free: 5 req/min, Pro: 20, Premium/Ultra: 60)
- **Global burst protection** prevents DoS (500 req/min across all users)
- Rate limit by **userId** (not IP) with dynamic tier lookup from database
- Return **429 status** with proper headers (Retry-After, X-RateLimit-*)
- **Separate Ratelimit instances** per tier with unique prefixes
- **Two-layer approach** for AI SaaS: request limits (infrastructure) + credit limits (budget)
- See `.claude/skills/backend/rate-limiting/SKILL.md` for comprehensive patterns

## Database Transactions

Critical operations requiring atomicity:

```typescript
await db.transaction(async (tx) => {
  // Update user credits
  await tx.update(users)
    .set({ creditsRemaining: sql`${users.creditsRemaining} - ${cost}` })
    .where(eq(users.id, userId))

  // Create usage record
  await tx.insert(usageRecords).values({
    userId,
    inputTokens,
    outputTokens,
    costCents: cost,
    model,
  })
})
```

### Key Points

- Use transactions for credit deductions
- Atomic operations prevent race conditions
- Rollback on error maintains data integrity
- Use SQL expressions for concurrent updates

## Input Validation

Zod schema validation for API requests:

```typescript
import { z } from "zod";

const schema = z.object({
  chatId: z.string().uuid(),
  message: z.string().min(1).max(10000),
});

const body = await request.json();
const result = schema.safeParse(body);

if (!result.success) {
  return Response.json({ error: "Invalid input" }, { status: 400 });
}

const { chatId, message } = result.data;
```

### Key Points

- Validate all user input with Zod
- Use `safeParse()` for error handling
- Return 400 for validation errors
- Share schemas via `apps/shared` package
