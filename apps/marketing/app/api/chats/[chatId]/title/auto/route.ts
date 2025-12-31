import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats, messages } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { anthropic } from '@/lib/anthropic'
import { CLAUDE_MODELS } from '@prophet/shared'
import { error, success } from '@/types'
import { logger } from '@/lib/logger'

const TITLE_GENERATION_PROMPT = `Generate a concise, descriptive title for a chat conversation based on the first user message and assistant response. The title should:
- Be 2-7 words
- Summarize the main topic
- Not start with "Chat about" or similar generic phrases
- Be professional and clear

First user message: {userMessage}

Assistant response: {assistantMessage}

Respond with ONLY the title, no quotes or explanation.`

function sanitizeTitle(title: string): string {
  return title
    .trim()
    .replace(/^["']|["']$/g, '')
    .substring(0, 100)
}

function isDefaultTitle(title: string): boolean {
  return title.startsWith('New Chat')
}

export async function POST(
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
          },
        }
      )
    }

    const chat = await db.query.chats.findFirst({
      where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    })

    if (!chat) {
      return NextResponse.json(error('Chat not found', 'CHAT_NOT_FOUND'), { status: 404 })
    }

    if (!isDefaultTitle(chat.title)) {
      logger.info({ userId, chatId, currentTitle: chat.title }, 'Skipping auto-title: title already customized')
      return NextResponse.json(success({ chatId, title: chat.title }))
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, chatId),
      orderBy: [asc(messages.createdAt)],
    })

    const userMessages = chatMessages.filter((m) => m.role === 'user')
    const assistantMessages = chatMessages.filter((m) => m.role === 'assistant')

    if (userMessages.length === 0 || assistantMessages.length === 0) {
      logger.info({ userId, chatId }, 'Skipping auto-title: insufficient messages')
      return NextResponse.json(success({ chatId, title: chat.title }))
    }

    const firstUserMessage = userMessages[0].content
    const firstAssistantMessage = assistantMessages[0].content

    const prompt = TITLE_GENERATION_PROMPT
      .replace('{userMessage}', firstUserMessage)
      .replace('{assistantMessage}', firstAssistantMessage)

    logger.debug({ userId, chatId }, 'Generating title with Haiku')

    const response = await anthropic.messages.create({
      model: CLAUDE_MODELS.HAIKU,
      max_tokens: 50,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const generatedTitle = response.content[0]?.type === 'text' ? response.content[0].text : 'New Chat'
    const sanitizedTitle = sanitizeTitle(generatedTitle)

    await db
      .update(chats)
      .set({
        title: sanitizedTitle,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId))

    logger.info(
      { userId, chatId, newTitle: sanitizedTitle },
      'Chat title auto-generated successfully'
    )

    return NextResponse.json(success({ chatId, title: sanitizedTitle }), { status: 200 })
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : String(err), userId },
      'Failed to auto-generate chat title'
    )
    return NextResponse.json(
      error('Internal server error', 'INTERNAL_ERROR', err),
      { status: 500 }
    )
  }
}

