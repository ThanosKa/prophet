import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { createChatSchema } from '@prophet/shared'
import { error, success } from '@/types'

/**
 * GET /api/chats
 * List all chats for the current user
 */
export async function GET() {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(error('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    // Check rate limit
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

    // Get chats for user
    const userChats = await db.query.chats.findMany({
      where: eq(chats.userId, userId),
      orderBy: [desc(chats.updatedAt)],
    })

    return NextResponse.json(success(userChats))
  } catch (err) {
    console.error('[GET /api/chats] Error:', err)
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}

/**
 * POST /api/chats
 * Create a new chat
 */
export async function POST(req: Request) {
  try {
    // Authenticate user
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(error('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    // Check rate limit
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

    // Parse and validate request body
    const body = await req.json()
    const validation = createChatSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        error('Invalid request body', 'VALIDATION_ERROR', validation.error.issues),
        { status: 400 }
      )
    }

    const { title } = validation.data

    // Create chat
    const [newChat] = await db
      .insert(chats)
      .values({
        userId,
        title,
      })
      .returning()

    return NextResponse.json(success(newChat), { status: 201 })
  } catch (err) {
    console.error('[POST /api/chats] Error:', err)
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
