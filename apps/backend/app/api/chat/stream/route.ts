import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, chats, messages, usageRecords } from '@/lib/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { anthropic, DEFAULT_MODEL, DEFAULT_MAX_TOKENS, SYSTEM_PROMPT } from '@/lib/anthropic'
import { streamMessageSchema } from '@prophet/shared'
import { error } from '@/types'

/**
 * POST /api/chat/stream
 * Stream AI chat response using Anthropic SDK
 *
 * This endpoint:
 * 1. Validates user authentication and rate limits
 * 2. Checks user has sufficient credits
 * 3. Fetches chat history for context
 * 4. Streams response from Anthropic API
 * 5. Saves user message and assistant response to database
 * 6. Deducts tokens from user credits
 * 7. Records usage in usageRecords table
 */
export async function POST(req: Request) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(error('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    // Check rate limit for streaming endpoint (stricter)
    const rateLimitResult = await checkRateLimit(userId, 'chat')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        error('Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '',
            'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '',
            'X-RateLimit-Reset': rateLimitResult.reset?.toString() || '',
          }
        }
      )
    }

    // Parse and validate request body
    const body = await req.json()
    const validation = streamMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        error('Invalid request body', 'VALIDATION_ERROR', validation.error.issues),
        { status: 400 }
      )
    }

    const { chatId, content } = validation.data

    // Verify chat ownership and get user credits
    const [chat, user] = await Promise.all([
      db.query.chats.findFirst({
        where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
      }),
      db.query.users.findFirst({
        where: eq(users.id, userId),
      }),
    ])

    if (!chat) {
      return NextResponse.json(error('Chat not found', 'CHAT_NOT_FOUND'), { status: 404 })
    }

    if (!user) {
      return NextResponse.json(error('User not found', 'USER_NOT_FOUND'), { status: 404 })
    }

    // Check if user has sufficient credits (estimate ~1000 tokens for safety)
    if (user.creditsRemaining < 1000) {
      return NextResponse.json(
        error('Insufficient credits. Please upgrade your plan.', 'INSUFFICIENT_CREDITS'),
        { status: 402 }
      )
    }

    // Get chat history for context
    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    })

    // Build messages array for Anthropic API
    const anthropicMessages = [
      ...chatMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user' as const,
        content,
      },
    ]

    // Create streaming response
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        let inputTokens = 0
        let outputTokens = 0

        try {
          // Start streaming from Anthropic
          const anthropicStream = await anthropic.messages.stream({
            model: DEFAULT_MODEL,
            max_tokens: DEFAULT_MAX_TOKENS,
            system: SYSTEM_PROMPT,
            messages: anthropicMessages,
          })

          // Process stream events
          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullResponse += text

              // Send delta to client
              const data = JSON.stringify({
                type: 'token',
                content: text,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } else if (event.type === 'message_start') {
              // Track input tokens
              inputTokens = event.message.usage.input_tokens
            } else if (event.type === 'message_delta') {
              // Track output tokens
              if (event.usage) {
                outputTokens = event.usage.output_tokens
              }
            }
          }

          // Calculate total tokens used
          const totalTokens = inputTokens + outputTokens

          // Save messages and update user credits in a transaction
          await db.transaction(async (tx) => {
            // Save user message
            await tx.insert(messages).values({
              chatId,
              role: 'user',
              content,
              inputTokens: 0,
              outputTokens: 0,
            })

            // Save assistant message
            await tx.insert(messages).values({
              chatId,
              role: 'assistant',
              content: fullResponse,
              inputTokens,
              outputTokens,
            })

            // Deduct tokens from user credits
            await tx
              .update(users)
              .set({
                creditsRemaining: sql`${users.creditsRemaining} - ${totalTokens}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId))

            // Record usage
            await tx.insert(usageRecords).values({
              userId,
              tokensUsed: totalTokens,
              model: DEFAULT_MODEL,
            })

            // Update chat updatedAt timestamp
            await tx
              .update(chats)
              .set({
                updatedAt: new Date(),
              })
              .where(eq(chats.id, chatId))
          })

          // Send completion event
          const doneData = JSON.stringify({
            type: 'done',
            usage: {
              inputTokens,
              outputTokens,
            },
          })
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))

          controller.close()
        } catch (err) {
          console.error('[POST /api/chat/stream] Streaming error:', err)

          // Send error event
          const errorData = JSON.stringify({
            type: 'error',
            error: err instanceof Error ? err.message : 'Streaming failed',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))

          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[POST /api/chat/stream] Error:', err)
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
