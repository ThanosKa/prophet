---
name: nextjs-api-patterns
description: Next.js 16 App Router API routes, middleware, and patterns. Use when building API endpoints, implementing rate limiting, handling errors, or streaming responses.
---

# Next.js 16 API Patterns

## When to Use
- Creating API route handlers
- Implementing middleware
- Rate limiting with Upstash
- Error handling patterns
- Response streaming

## Route Handler Basics

### GET Handler
```typescript
// app/api/chats/route.ts
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userChats = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.updatedAt)],
  })

  return Response.json(userChats)
}
```

### POST Handler
```typescript
// app/api/chats/route.ts
import { z } from 'zod'

const createChatSchema = z.object({
  title: z.string().min(1).max(100).optional(),
})

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = createChatSchema.safeParse(body)

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const [newChat] = await db.insert(chats)
    .values({ userId, title: parsed.data.title ?? 'New Chat' })
    .returning()

  return Response.json(newChat, { status: 201 })
}
```

### Dynamic Route
```typescript
// app/api/chats/[chatId]/route.ts
import { NextRequest } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: { messages: true },
  })

  if (!chat) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  return Response.json(chat)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params
  const { userId } = await auth()

  await db.delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))

  return new Response(null, { status: 204 })
}
```

## Rate Limiting with Upstash

### lib/ratelimit.ts
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Different limiters for different tiers
export const rateLimiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:free',
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'ratelimit:pro',
  }),
  premium: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(120, '1 m'),
    prefix: 'ratelimit:premium',
  }),
  ultra: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(300, '1 m'),
    prefix: 'ratelimit:ultra',
  }),
}
```

### Rate Limit Middleware
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
})

const isApiRoute = createRouteMatcher(['/api/chat(.*)'])

export default clerkMiddleware(async (auth, request: NextRequest, event: NextFetchEvent) => {
  // Rate limit API routes
  if (isApiRoute(request)) {
    const { userId } = await auth()
    const identifier = userId ?? request.ip ?? 'anonymous'

    const { success, limit, remaining, pending } = await ratelimit.limit(identifier)
    event.waitUntil(pending)

    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
          },
        }
      )
    }
  }

  // ... rest of middleware
})
```

## Error Handling

### Centralized Error Handler
```typescript
// lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
  }
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  if (error instanceof z.ZodError) {
    return Response.json(
      { error: 'Validation failed', details: error.flatten() },
      { status: 400 }
    )
  }

  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

### Usage in Route
```typescript
export async function POST(request: Request) {
  try {
    // ... handler logic
  } catch (error) {
    return handleApiError(error)
  }
}
```

## Streaming Response

### SSE Stream
```typescript
export async function POST(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send events
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

      // ... process and send more events

      controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

## CORS Headers (for Extension)

### API Route with CORS
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specific extension origin
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders })
}

export async function POST(request: Request) {
  // ... handler
  return Response.json(data, { headers: corsHeaders })
}
```

## Anti-Patterns
- Don't use `export const runtime = 'edge'` with Drizzle (use Node.js)
- Avoid large payloads in request body (use streaming)
- Don't forget to await `params` in dynamic routes (Next.js 16)
- Never trust client data without validation

## Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio"
  }
}
```
