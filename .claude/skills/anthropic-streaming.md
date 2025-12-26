---
name: anthropic-streaming
description: Streaming AI responses with Anthropic SDK in Next.js API routes. Use when implementing chat endpoints, handling SSE streams, counting tokens, or proxying AI requests.
---

# Anthropic Streaming Patterns

## When to Use
- Building chat API endpoints
- Implementing Server-Sent Events (SSE)
- Handling streaming responses
- Counting tokens for billing
- Secure API key proxying

## SDK Setup

### lib/anthropic.ts
```typescript
import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export const MODELS = {
  default: 'claude-sonnet-4-20250514',
  fast: 'claude-3-5-haiku-20241022',
} as const
```

## Streaming API Route

### app/api/chat/route.ts
```typescript
import { auth } from '@clerk/nextjs/server'
import { anthropic, MODELS } from '@/lib/anthropic'
import { db } from '@/lib/db'
import { users, messages } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check credits
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  if (!user || user.creditsRemaining <= 0) {
    return new Response('Insufficient credits', { status: 402 })
  }

  const { chatId, messages: chatMessages } = await request.json()

  // Create streaming response
  const stream = await anthropic.messages.stream({
    model: MODELS.default,
    max_tokens: 4096,
    messages: chatMessages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  })

  // Track tokens after stream completes
  stream.on('finalMessage', async (message) => {
    const inputTokens = message.usage.input_tokens
    const outputTokens = message.usage.output_tokens
    const totalTokens = inputTokens + outputTokens

    // Deduct credits and save message
    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ creditsRemaining: sql`${users.creditsRemaining} - ${totalTokens}` })
        .where(eq(users.id, userId))

      await tx.insert(messages).values({
        chatId,
        role: 'assistant',
        content: message.content[0].type === 'text' ? message.content[0].text : '',
        inputTokens,
        outputTokens,
      })
    })
  })

  // Return SSE stream
  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

## Client-Side Consumption

### In Extension (React)
```typescript
import { useCallback, useState } from 'react'

export function useChat() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [content, setContent] = useState('')

  const sendMessage = useCallback(async (chatId: string, messages: Message[]) => {
    setIsStreaming(true)
    setContent('')

    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ chatId, messages }),
    })

    if (!response.ok) {
      throw new Error(response.statusText)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      // Parse SSE events
      const lines = chunk.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta') {
              setContent(prev => prev + parsed.delta.text)
            }
          } catch {}
        }
      }
    }

    setIsStreaming(false)
  }, [])

  return { sendMessage, content, isStreaming }
}
```

## Non-Streaming (Simple)
```typescript
export async function POST(request: Request) {
  const { prompt } = await request.json()

  const message = await anthropic.messages.create({
    model: MODELS.fast,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  return Response.json({
    content: message.content[0].type === 'text' ? message.content[0].text : '',
    usage: message.usage,
  })
}
```

## Event Types in Stream
```typescript
// Key events to handle
interface StreamEvents {
  'message_start': { message: { id: string, model: string } }
  'content_block_start': { index: number, content_block: { type: 'text' } }
  'content_block_delta': { delta: { type: 'text_delta', text: string } }
  'content_block_stop': { index: number }
  'message_delta': { delta: { stop_reason: string }, usage: { output_tokens: number } }
  'message_stop': {}
}
```

## Error Handling
```typescript
try {
  const stream = await anthropic.messages.stream({ ... })
  // ...
} catch (error) {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) {
      return new Response('Rate limited', { status: 429 })
    }
    if (error.status === 400) {
      return new Response('Invalid request', { status: 400 })
    }
  }
  return new Response('Internal error', { status: 500 })
}
```

## Anti-Patterns
- Never expose ANTHROPIC_API_KEY to client
- Don't forget to track token usage for billing
- Avoid blocking on stream completion (use events)
- Don't send entire conversation history (trim older messages)

## Token Estimation (Before Request)
```typescript
// Rough estimate: 1 token ≈ 4 characters
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Check if user has enough credits before request
const estimatedCost = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0)
if (user.creditsRemaining < estimatedCost * 2) { // 2x for response
  return new Response('Insufficient credits', { status: 402 })
}
```
