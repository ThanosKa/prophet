import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, chats, messages, usageRecords } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { anthropic, DEFAULT_MODEL, DEFAULT_MAX_TOKENS, SYSTEM_PROMPT } from '@/lib/anthropic'
import { streamMessageSchema } from '@prophet/shared'
import { error } from '@/types'
import { logger } from '@/lib/logger'

export async function POST(req: Request) {
  try {
    const auth_ = await auth()
    const userId = auth_.userId
    if (!userId) {
      return NextResponse.json(error('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const rateLimitResult = await checkRateLimit(userId, 'chat')
    if (!rateLimitResult.success) {
      logger.warn({ userId, remaining: rateLimitResult.remaining }, 'Rate limit exceeded for chat endpoint')
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

    const body = await req.json()
    const validation = streamMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        error('Invalid request body', 'VALIDATION_ERROR', validation.error.issues),
        { status: 400 }
      )
    }

    const { chatId, content } = validation.data

    const [chat, user] = await Promise.all([
      db.query.chats.findFirst({
        where: eq(chats.id, chatId),
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

    if (user.creditsRemaining < 1000) {
      logger.warn({ userId, creditsRemaining: user.creditsRemaining }, 'Insufficient credits for chat')
      return NextResponse.json(
        error('Insufficient credits. Please upgrade your plan.', 'INSUFFICIENT_CREDITS'),
        { status: 402 }
      )
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    })

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

    logger.debug({ userId, chatId, messageCount: anthropicMessages.length }, 'Starting stream')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''
        let inputTokens = 0
        let outputTokens = 0

        try {
          const anthropicStream = await anthropic.messages.stream({
            model: DEFAULT_MODEL,
            max_tokens: DEFAULT_MAX_TOKENS,
            system: SYSTEM_PROMPT,
            messages: anthropicMessages,
          })

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text
              fullResponse += text

              const data = JSON.stringify({
                type: 'token',
                content: text,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            } else if (event.type === 'message_start') {
              inputTokens = event.message.usage.input_tokens
            } else if (event.type === 'message_delta') {
              if (event.usage) {
                outputTokens = event.usage.output_tokens
              }
            }
          }

          const totalTokens = inputTokens + outputTokens

          await db.transaction(async (tx) => {
            await tx.insert(messages).values({
              chatId,
              role: 'user',
              content,
              inputTokens: 0,
              outputTokens: 0,
            })

            await tx.insert(messages).values({
              chatId,
              role: 'assistant',
              content: fullResponse,
              inputTokens,
              outputTokens,
            })

            await tx
              .update(users)
              .set({
                creditsRemaining: sql`${users.creditsRemaining} - ${totalTokens}`,
                updatedAt: new Date(),
              })
              .where(eq(users.id, userId))

            await tx.insert(usageRecords).values({
              userId,
              tokensUsed: totalTokens,
              model: DEFAULT_MODEL,
            })

            await tx
              .update(chats)
              .set({
                updatedAt: new Date(),
              })
              .where(eq(chats.id, chatId))
          })

          logger.info({ userId, chatId, totalTokens, inputTokens, outputTokens }, 'Stream completed successfully')

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
          logger.error({ error: err instanceof Error ? err.message : String(err), userId, chatId }, 'Streaming error')

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
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Stream endpoint error')
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
