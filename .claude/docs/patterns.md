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
  // Automatic caching: the breakpoint follows the newest block on every request.
  cache_control: { type: 'ephemeral' },
  // Explicit breakpoint on the static prefix (tools + system), shared by every chat.
  system: [{ type: 'text', text: AGENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  tools: buildAgentTools(AGENT_TOOLS, enableWebSearch),
  // DB history + the run's opening message + every earlier turn of the run, append-only
  messages: buildAgentMessages({ history, userMessage, image, runTurns }),
})

const finalMessage = await stream.finalMessage()
const { usage } = finalMessage

// `input_tokens` is only the uncached remainder; cache writes and reads are billed
// separately (writes 1.25x input, reads 0.1x, 0.05x on Opus 5.5 and Sonnet 5.5).
// Haiku 5.5 bills the whole request at a higher rate card once the prompt passes 100K tokens.
const costCents = calculateUsageCostInCredits(model, {
  inputTokens: usage.input_tokens,
  cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  outputTokens: usage.output_tokens,
  webSearchRequests: usage.server_tool_use?.web_search_requests ?? 0,
})

await db.transaction(async tx => {
  await tx.update(users)
    .set({ creditsRemaining: sql`${users.creditsRemaining} - ${costCents}` })
    .where(eq(users.id, userId))

  await tx.insert(usageRecords).values({
    userId,
    inputTokens: usage.input_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    outputTokens: usage.output_tokens,
    costCents,
    model,
  })
})

return new Response(stream.toReadableStream(), {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

### Key Points

- Use `anthropic.messages.stream()` for streaming responses
- Await `finalMessage()` for authoritative usage, including `server_tool_use.web_search_requests`
- Release client tool calls only after a `tool_use` stop: collect them while streaming and send the `tool_use` events after `finalMessage()`, before `citations`, `execution_complete` and `done` (extension 1.0.5 takes `execution_complete` without a prior tool call as the final answer). On `max_tokens`, `refusal`, Stop or an error, send none and store none; on `max_tokens`, `done.contentBlocks` drops the cut-off call
- Resolve legacy model IDs before the call and bill from the model actually invoked
- Bill all three input buckets with `calculateUsageCostInCredits`; the prompt's size is `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`, which is what context displays must show
- Deduct credits in a database transaction
- Return stream with proper Content-Type header
- Never expose `ANTHROPIC_API_KEY` to client

### Prompt Caching

Caching is a prefix match over `tools` -> `system` -> `messages`; any changed byte
invalidates everything after it. The agent route uses two of the four breakpoints:

| Breakpoint | Covers | Why |
| --- | --- | --- |
| `cache_control` on the system block | 18 tools + system prompt (~4.4k tokens) | Identical for every user and chat, so it is a guaranteed read point that survives anything later in `messages` |
| Top-level `cache_control` (automatic) | The whole conversation so far | Moves to the newest block each request, so turn N+1 reads what turn N wrote |

Rules that keep it hitting:

- **Append-only runs.** The extension resends every earlier turn of the run as
  `previousTurns` (the server's `contentBlocks` from each `done` event, unchanged),
  plus the run's image. Never trim, reorder or rewrite an earlier turn.
- **Replay thinking blocks.** They are part of the prefix and are signature-checked by
  the API; dropping or editing them breaks the cache and, on every current model,
  the preserved-thinking check.
- **Same settings for the whole run.** The same `enableThinking` on every request, so
  `thinking` and `output_config.effort` never change mid-run. Tool order is a fixed
  array; web search is a server-wide flag. No timestamps or IDs in the system prompt.
- **Minimums.** Haiku 5.5, Sonnet 5.5 and Opus 5.5 all cache prefixes from 512 tokens,
  so the tools + system breakpoint (~4.4k tokens) caches on every model. Don't pad the prompt.
- **Verify** with `usage.cache_read_input_tokens` (persisted on `usage_records`); in a
  healthy run it grows every turn while `cache_creation_input_tokens` stays near the
  size of the last turn.
- Credit reservations deliberately ignore caching and price the whole estimated prompt
  as uncached input. The estimator over-counts ASCII text ~1.75-2x, which covers the
  1.25x cache-write premium; a turn that settles above its hold is logged.

### Model IDs and Legacy Aliases

Vite inlines `MODEL_CONFIG` into the extension bundle at build time, so installed
builds keep sending the model IDs they shipped with. `agentModelSchema` therefore
still accepts those legacy IDs, and `resolveAgentModel()` maps them to the current
model before the Anthropic call. Every cost calculation and DB row must use the
resolved value, never the raw request field.

| Sent by installed extension builds | Actually called |
| --- | --- |
| `claude-opus-5` | `claude-opus-5-5` |
| `claude-opus-4-6` | `claude-opus-5-5` |
| `claude-sonnet-5` | `claude-sonnet-5-5` |
| `claude-sonnet-4-6` | `claude-sonnet-5-5` |
| `claude-haiku-4-5` | `claude-haiku-5-5` |

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
