import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats, messages } from '@/lib/db/schema'
import { and, eq, desc, lt } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { error, success } from '@/types'
import { logger } from '@/lib/logger'

export async function GET(
  req: Request,
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

    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit')
    const beforeCreatedAtParam = url.searchParams.get('beforeCreatedAt')

    const limit = Math.min(Math.max(parseInt(limitParam || '50'), 1), 200)
    const beforeCreatedAt = beforeCreatedAtParam ? new Date(beforeCreatedAtParam) : null

    const whereCondition = beforeCreatedAt
      ? and(eq(messages.chatId, chatId), lt(messages.createdAt, beforeCreatedAt))
      : eq(messages.chatId, chatId)

    const chatMessages = await db.query.messages.findMany({
      where: whereCondition,
      orderBy: [desc(messages.createdAt)],
      limit: limit + 1,
    })

    const hasMore = chatMessages.length > limit
    const paginatedMessages = chatMessages.slice(0, limit)
    const reversed = paginatedMessages.reverse()

    const nextCursor = hasMore && paginatedMessages.length > 0
      ? { beforeCreatedAt: paginatedMessages[0].createdAt.toISOString() }
      : null

    const parsedMessages = reversed.map(msg => ({
      ...msg,
      toolCalls: typeof msg.toolCalls === 'string' ? JSON.parse(msg.toolCalls) : msg.toolCalls
    }))

    logger.info({ userId, chatId, messageCount: parsedMessages.length, hasMore }, 'Messages fetched with pagination')
    return NextResponse.json(success({
      messages: parsedMessages,
      nextCursor,
      hasMore,
    }))
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), userId }, 'Failed to fetch messages')
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
