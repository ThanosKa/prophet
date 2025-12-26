---
name: api-security
description: Security and best practices for API design. Use when writing API routes, handling authentication, or processing user input.
---

# API Security & Design Patterns

## Request Validation (ALWAYS)
```typescript
import { z } from 'zod'

// ✅ GOOD - Validate ALL input
const createMessageSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().min(1).max(10000),
})

export async function POST(request: Request) {
  const body = await request.json()
  const result = createMessageSchema.safeParse(body)

  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 }
    )
  }

  // Now safe to use result.data
  const { chatId, content } = result.data
}

// ❌ BAD - No validation (security risk!)
export async function POST(request: Request) {
  const { chatId, content } = await request.json()
  // Trusting user input = SQL injection, XSS, etc.
}
```

## Authentication (ALWAYS Check)
```typescript
import { auth } from '@clerk/nextjs/server'

// ✅ GOOD - Always authenticate
export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Proceed with authenticated user
}

// ❌ BAD - No auth check
export async function POST(request: Request) {
  // Anyone can call this!
}
```

## Authorization (Resource Ownership)
```typescript
// ✅ GOOD - Verify user owns resource
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chatId } = await params

  // Verify ownership
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  })

  if (!chat) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  await db.delete(chats).where(eq(chats.id, chatId))
  return new Response(null, { status: 204 })
}

// ❌ BAD - No ownership check (users can delete others' chats!)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params
  await db.delete(chats).where(eq(chats.id, chatId))
  return new Response(null, { status: 204 })
}
```

## Rate Limiting
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

// ✅ GOOD - Rate limit by user
export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { success } = await ratelimit.limit(userId)
  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Process request
}
```

## Error Handling
```typescript
// ✅ GOOD - Consistent error structure
interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export async function POST(request: Request) {
  try {
    // Business logic
  } catch (error) {
    console.error('API Error:', error)

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'Insufficient credits') {
      return Response.json({ error: error.message, code: 'INSUFFICIENT_CREDITS' }, { status: 402 })
    }

    // Never expose internal errors
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ❌ BAD - Exposing stack traces
export async function POST(request: Request) {
  try {
    // ...
  } catch (error) {
    return Response.json({ error: error.stack }, { status: 500 }) // Leaks internals!
  }
}
```

## Response Structure
```typescript
// ✅ GOOD - Consistent response format
interface ApiResponse<T> {
  data?: T
  error?: string
  code?: string
}

export async function GET() {
  const chats = await db.query.chats.findMany()
  return Response.json({ data: chats })
}

export async function POST(request: Request) {
  // On error
  return Response.json({ error: 'Invalid input', code: 'VALIDATION_ERROR' }, { status: 400 })
}

// ❌ BAD - Inconsistent responses
export async function GET() {
  return Response.json(chats) // Sometimes array
}

export async function POST() {
  return Response.json({ success: true, result: chat }) // Different structure
}
```

## Secrets Management
```typescript
// ✅ GOOD - Server-side only
// app/api/chat/route.ts
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY! // Server-side only

// ❌ BAD - Exposed to client
const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY // Client can see this!

// ✅ GOOD - Proxy pattern
// Backend proxies AI requests
export async function POST(request: Request) {
  const { userId } = await auth()
  const response = await anthropic.messages.create({
    /* ... */
  }) // API key stays on server
  return Response.json(response)
}

// ❌ BAD - Client calls AI directly
// Extension makes request with exposed API key
```

## SQL Injection Prevention
```typescript
// ✅ GOOD - Parameterized queries (Drizzle)
const userId = 'user-123'
const chats = await db.query.chats.findMany({
  where: eq(chats.userId, userId),
})

// ❌ BAD - String interpolation (vulnerable!)
const chats = await db.execute(
  sql`SELECT * FROM chats WHERE user_id = ${userId}` // If userId is from user, SQL injection risk
)

// ✅ GOOD - Even with raw SQL, use placeholders
const chats = await db.execute(
  sql`SELECT * FROM chats WHERE user_id = ${userId}` // Drizzle escapes properly
)
```

## CORS for Extension
```typescript
// ✅ GOOD - Specific origin (if self-hosted extension)
const corsHeaders = {
  'Access-Control-Allow-Origin': 'chrome-extension://YOUR_EXTENSION_ID',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

export async function POST(request: Request) {
  // ... handle request
  return Response.json(data, { headers: corsHeaders })
}

// ⚠️ ACCEPTABLE - Wildcard for public API (with auth)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
}
// Still secure if you check auth on every request
```

## Input Sanitization
```typescript
import DOMPurify from 'isomorphic-dompurify'

// ✅ GOOD - Sanitize HTML content
const createMessageSchema = z.object({
  content: z.string().transform(val => DOMPurify.sanitize(val)),
})

// ✅ GOOD - Limit size (DoS prevention)
const createMessageSchema = z.object({
  content: z.string().max(10000), // Prevent huge payloads
})

// ❌ BAD - No sanitization (XSS risk)
const content = request.body.content
await db.insert(messages).values({ content }) // Could contain <script> tags
```

## Credit/Usage Tracking
```typescript
// ✅ GOOD - Atomic credit deduction
export async function POST(request: Request) {
  const { userId } = await auth()

  await db.transaction(async tx => {
    // Check credits
    const [user] = await tx.select().from(users).where(eq(users.id, userId))
    if (user.creditsRemaining < estimatedCost) {
      throw new Error('Insufficient credits')
    }

    // Process request
    const response = await anthropic.messages.create({
      /* ... */
    })

    // Deduct credits
    const actualCost = response.usage.input_tokens + response.usage.output_tokens
    await tx
      .update(users)
      .set({ creditsRemaining: sql`${users.creditsRemaining} - ${actualCost}` })
      .where(eq(users.id, userId))
  })
}

// ❌ BAD - Race condition
const user = await db.select().from(users).where(eq(users.id, userId))
if (user.creditsRemaining < cost) {
  throw new Error('Insufficient credits')
}
// User could make 2 requests at once and bypass check
await db.update(users).set({ creditsRemaining: user.creditsRemaining - cost })
```

## Webhook Signature Verification
```typescript
import { Webhook } from 'svix'

// ✅ GOOD - Verify webhook signatures
export async function POST(request: Request) {
  const payload = await request.text()
  const headers = request.headers

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  try {
    const evt = wh.verify(payload, {
      'svix-id': headers.get('svix-id')!,
      'svix-timestamp': headers.get('svix-timestamp')!,
      'svix-signature': headers.get('svix-signature')!,
    })

    // Process verified webhook
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }
}

// ❌ BAD - No verification (anyone can spoof webhooks)
export async function POST(request: Request) {
  const payload = await request.json()
  // Trust payload without verification
}
```

## Anti-Patterns to Avoid
- ❌ No input validation
- ❌ Missing authentication checks
- ❌ No ownership verification (authorization)
- ❌ Exposing error stack traces
- ❌ Hardcoded secrets in code
- ❌ No rate limiting
- ❌ SQL injection via string interpolation
- ❌ Trusting client-side data
- ❌ Missing CORS headers (for extensions)
- ❌ Race conditions in credit checks

## Quick Checklist
- [ ] Input validated with Zod
- [ ] User authenticated
- [ ] Resource ownership verified
- [ ] Rate limiting implemented
- [ ] Errors don't expose internals
- [ ] No secrets in client code
- [ ] Parameterized queries only
- [ ] Webhook signatures verified
- [ ] Credits deducted atomically
- [ ] CORS configured for extension
