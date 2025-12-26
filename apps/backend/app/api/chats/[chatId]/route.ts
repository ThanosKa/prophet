import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { error, success } from '@/types'

/**
 * GET /api/chats/[chatId]
 * Get a single chat by ID
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

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

    // Get chat and verify ownership
    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    })

    if (!chat) {
      return NextResponse.json(error('Chat not found', 'CHAT_NOT_FOUND'), { status: 404 })
    }

    return NextResponse.json(success(chat))
  } catch (err) {
    console.error('[GET /api/chats/[chatId]] Error:', err)
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chats/[chatId]
 * Delete a chat by ID
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params

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

    // Verify ownership before deleting
    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    })

    if (!chat) {
      return NextResponse.json(error('Chat not found', 'CHAT_NOT_FOUND'), { status: 404 })
    }

    // Delete chat (cascade will delete associated messages)
    await db.delete(chats).where(eq(chats.id, chatId))

    return NextResponse.json(success({ deleted: true }))
  } catch (err) {
    console.error('[DELETE /api/chats/[chatId]] Error:', err)
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}
