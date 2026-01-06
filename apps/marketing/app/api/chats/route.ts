import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import { and, eq, desc, lt } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { createChatSchema } from '@prophet/shared'
import { error, success } from '@/types'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  let userId: string | null = null
  try {
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

    const url = new URL(req.url)
    const limitParam = url.searchParams.get('limit')
    const beforeUpdatedAtParam = url.searchParams.get('beforeUpdatedAt')

    // Validate limit parameter
    const parsedLimit = parseInt(limitParam || '50')
    if (isNaN(parsedLimit)) {
      return NextResponse.json(error('Invalid limit parameter', 'INVALID_PARAM'), { status: 400 })
    }
    const limit = Math.min(Math.max(parsedLimit, 1), 200)

    // Validate date parameter
    let beforeUpdatedAt: Date | null = null
    if (beforeUpdatedAtParam) {
      beforeUpdatedAt = new Date(beforeUpdatedAtParam)
      if (isNaN(beforeUpdatedAt.getTime())) {
        return NextResponse.json(error('Invalid date format', 'INVALID_DATE'), { status: 400 })
      }
    }

    const whereCondition = beforeUpdatedAt
      ? and(eq(chats.userId, userId), lt(chats.updatedAt, beforeUpdatedAt))
      : eq(chats.userId, userId)

    const userChats = await db.query.chats.findMany({
      where: whereCondition,
      orderBy: [desc(chats.updatedAt)],
      limit: limit + 1,
    })

    const hasMore = userChats.length > limit
    const paginatedChats = userChats.slice(0, limit)

    const nextCursor = hasMore && paginatedChats.length > 0
      ? { beforeUpdatedAt: paginatedChats[paginatedChats.length - 1].updatedAt.toISOString() }
      : null

    logger.info({ userId, chatCount: paginatedChats.length, hasMore }, 'Chats fetched with pagination')
    return NextResponse.json(success({
      chats: paginatedChats,
      nextCursor,
      hasMore,
    }))
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), userId }, 'Failed to fetch chats')
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  let userId: string | null = null
  try {
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

    const body = await req.json()
    const validation = createChatSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        error('Invalid request body', 'VALIDATION_ERROR', validation.error.issues),
        { status: 400 }
      )
    }

    const { title } = validation.data

    const [newChat] = await db
      .insert(chats)
      .values({
        userId,
        title,
      })
      .returning()

    logger.info({ userId, chatId: newChat.id }, 'Chat created successfully')
    return NextResponse.json(success(newChat), { status: 201 })
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), userId }, 'Failed to create chat')
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
