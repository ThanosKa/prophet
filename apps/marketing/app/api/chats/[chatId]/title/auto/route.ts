import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chats, messages, users } from '@/lib/db/schema'
import { and, eq, asc } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/ratelimit'
import { anthropic } from '@/lib/anthropic'
import { CLAUDE_MODELS } from '@prophet/shared'
import { error, success, INTERNAL_ERROR_MESSAGE } from '@/types'
import { logger } from '@/lib/logger'
import { totalCredits } from '@/lib/credit-balance'

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

const MAX_SOURCE_CHARS = 1000
const MAX_FALLBACK_TITLE_CHARS = 50
const UNTITLED_CHAT = 'Untitled Chat'

function isDefaultTitle(title: string): boolean {
  return title.startsWith('New Chat')
}

// The title must never stay at a 'New Chat' default once generation was attempted,
// because the sidepanel re-requests generation for as long as it sees that prefix.
function fallbackTitle(firstUserMessage: string): string {
  const title = firstUserMessage.replace(/\s+/g, ' ').trim().substring(0, MAX_FALLBACK_TITLE_CHARS).trim()
  return title && !isDefaultTitle(title) ? title : UNTITLED_CHAT
}

async function generateTitle({ userMessage, assistantMessage }: { userMessage: string; assistantMessage: string }) {
  const prompt = TITLE_GENERATION_PROMPT
    .replace('{userMessage}', () => userMessage.substring(0, MAX_SOURCE_CHARS))
    .replace('{assistantMessage}', () => assistantMessage.substring(0, MAX_SOURCE_CHARS))

  const response = await anthropic.messages.create({
    model: CLAUDE_MODELS.HAIKU,
    max_tokens: 50,
    // Haiku 5.5 thinks by default, which would spend this small budget before the title.
    thinking: { type: 'disabled' },
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock?.type === 'text' ? sanitizeTitle(textBlock.text) : ''
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
    const fallback = fallbackTitle(firstUserMessage)

    // Claim the chat by swapping the default title for the fallback in one conditional
    // UPDATE: only the request that wins it may call Anthropic, at most once per chat.
    const claimed = await db
      .update(chats)
      .set({ title: fallback, updatedAt: new Date() })
      .where(and(eq(chats.id, chatId), eq(chats.title, chat.title)))
      .returning({ id: chats.id })

    if (claimed.length === 0) {
      logger.info({ userId, chatId }, 'Skipping auto-title: already claimed by another request')
      return NextResponse.json(success({ chatId, title: fallback }))
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { creditsRemaining: true, purchasedCredits: true },
    })

    if (!user || totalCredits(user) <= 0) {
      logger.info({ userId, chatId }, 'Skipping auto-title generation: no credits, using fallback title')
      return NextResponse.json(success({ chatId, title: fallback }))
    }

    logger.debug({ userId, chatId }, 'Generating title with Haiku')

    let generatedTitle = ''
    try {
      generatedTitle = await generateTitle({
        userMessage: firstUserMessage,
        assistantMessage: firstAssistantMessage,
      })
    } catch (err) {
      logger.warn(
        { userId, chatId, error: err instanceof Error ? err.message : String(err) },
        'Title generation failed, keeping fallback title'
      )
    }

    if (!generatedTitle || isDefaultTitle(generatedTitle)) {
      return NextResponse.json(success({ chatId, title: fallback }))
    }

    await db
      .update(chats)
      .set({
        title: generatedTitle,
        updatedAt: new Date(),
      })
      .where(eq(chats.id, chatId))

    logger.info(
      { userId, chatId, newTitle: generatedTitle },
      'Chat title auto-generated successfully'
    )

    return NextResponse.json(success({ chatId, title: generatedTitle }), { status: 200 })
  } catch (err) {
    logger.error(
      { error: err instanceof Error ? err.message : String(err), userId },
      'Failed to auto-generate chat title'
    )
    return NextResponse.json(
      error(INTERNAL_ERROR_MESSAGE, 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

