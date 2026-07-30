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
// Never pass the raw client value: installed extensions send legacy model IDs.
const model = resolveAgentModel(requestedModel)

const stream = await anthropic.messages.stream({
  model,
  max_tokens: 4096,
  messages: [...],
  tools: buildAgentTools(AGENT_TOOLS, enableWebSearch),
})

const finalMessage = await stream.finalMessage()
const webSearchRequests = finalMessage.usage.server_tool_use?.web_search_requests ?? 0

const costCents = calculateCostInCents(
  model,
  finalMessage.usage.input_tokens,
  finalMessage.usage.output_tokens,
  webSearchRequests,
)

await db.transaction(async tx => {
  await tx.update(users)
    .set({ creditsRemaining: sql`${users.creditsRemaining} - ${costCents}` })
    .where(eq(users.id, userId))

  await tx.insert(usageRecords).values({ userId, costCents, model })
})

return new Response(stream.toReadableStream(), {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

### Key Points

- Use `anthropic.messages.stream()` for streaming responses
- Await `finalMessage()` for authoritative usage, including `server_tool_use.web_search_requests`
- Resolve legacy model IDs before the call and bill from the model actually invoked
- Deduct credits in a database transaction
- Return stream with proper Content-Type header
- Never expose `ANTHROPIC_API_KEY` to client

### Model IDs and Legacy Aliases

Vite inlines `MODEL_CONFIG` into the extension bundle at build time, so installed
builds keep sending the model IDs they shipped with. `agentModelSchema` therefore
still accepts those legacy IDs, and `resolveAgentModel()` maps them to the current
model before the Anthropic call. Every cost calculation and DB row must use the
resolved value, never the raw request field.

| Sent by installed extension builds | Actually called |
| --- | --- |
| `claude-opus-4-6` | `claude-opus-5` |
| `claude-sonnet-4-6` | `claude-sonnet-5` |
| `claude-haiku-4-5` | `claude-haiku-4-5` (unchanged) |

### Server-Side Web Search

Anthropic's `web_search_20250305` tool runs on Anthropic's infrastructure and is
billed per search ($10 per 1,000) on top of tokens. It is gated twice: the
`ENABLE_WEB_SEARCH` env flag and the per-request `enableWebSearch` field, and stays
off until the extension can render its blocks. Search results carry
`encrypted_content` that must be echoed back byte-for-byte on continuation turns,
so continuation content comes from `finalMessage.content` rather than being
rebuilt from streamed deltas.

## Rate Limiting

Tier-based rate limiting with Upstash Redis:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Define limits per tier
const chatLimits = {
  free: { requests: 60, window: '1 m' },
  pro: { requests: 120, window: '1 m' },
  premium: { requests: 240, window: '1 m' },
  ultra: { requests: 240, window: '1 m' },
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
- **Tier-based limits** sized for agent loops, not chat (Free: 60 req/min, Pro: 120, Premium/Ultra: 240). A single agent run fires one POST per tool round-trip, so chat-scale limits (5/min) starve normal usage. Credits are the real product quota.
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
