import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats, messages } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { error, success } from '@/types'
import { logger } from '@/lib/logger'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  let userId: string | null = null
  try {
    const { chatId } = await params

    const auth_ = await auth()
    userId = auth_.userId
    if (!userId) {
      return NextResponse.json(error('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const rateLimitResult = await checkRateLimit(userId, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        error('Too many requests', 'RATE_LIMIT_EXCEEDED'),
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

    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    })

    if (!chat) {
      return NextResponse.json(error('Chat not found', 'CHAT_NOT_FOUND'), { status: 404 })
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: [asc(messages.createdAt)],
    })

    const parsedMessages = chatMessages.map(msg => ({
      ...msg,
      toolCalls: typeof msg.toolCalls === 'string' ? JSON.parse(msg.toolCalls) : msg.toolCalls
    }))

    logger.info({ userId, chatId, messageCount: chatMessages.length }, 'Messages fetched')
    return NextResponse.json(success(parsedMessages))
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), userId }, 'Failed to fetch messages')
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
