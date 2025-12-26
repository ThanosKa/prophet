import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { createChatSchema } from '@prophet/shared'
import { error, success } from '@/types'
import { logger } from '@/lib/logger'

export async function GET() {
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

    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      orderBy: [desc(chats.updatedAt)],
    })

    return NextResponse.json(success(userChats))
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
