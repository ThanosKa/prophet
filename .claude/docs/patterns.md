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

Upstash Redis rate limiting pattern:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

const { success } = await ratelimit.limit(userId);
if (!success) {
  return Response.json({ error: "Too many requests" }, { status: 429 });
}
```

### Key Points

- Use sliding window algorithm (10 requests per minute)
- Rate limit by `userId` (not IP)
- Return 429 status for rate-limited requests
- Configure in middleware or individual API routes

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
