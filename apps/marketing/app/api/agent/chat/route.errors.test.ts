import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { APIError } from '@anthropic-ai/sdk'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import { POST } from './route'

vi.mock('@/lib/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dbSchema = await import('@/lib/db/schema')
  return { db: drizzle(new PGlite(), { schema: dbSchema }) }
})

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/lib/anthropic', () => ({ anthropic: { messages: { stream: vi.fn() } } }))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/dev-logger', () => ({
  devLogger: { logRequest: vi.fn(), logResponse: vi.fn() },
}))

const { db } = await import('@/lib/db')
const { auth } = await import('@clerk/nextjs/server')
const { checkRateLimit } = await import('@/lib/ratelimit')
const { anthropic } = await import('@/lib/anthropic')

const USER_ID = 'user_errors'
const CHAT_ID = '550e8400-e29b-41d4-a716-446655440000'

beforeAll(async () => {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
  await db.insert(schema.users).values({ id: USER_ID, email: 'errors@example.com', creditsRemaining: 1000 })
  await db.insert(schema.chats).values({ id: CHAT_ID, userId: USER_ID, title: 'Chat' })
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ userId: USER_ID } as never)
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 60 })
})

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost:3000/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: CHAT_ID, ...body }),
    })
  )
}

/** The SDK's own factory, so the error has the exact class and message a real 400 has. */
function anthropicBadRequest(message: string) {
  return APIError.generate(
    400,
    { type: 'error', error: { type: 'invalid_request_error', message } },
    undefined,
    new Headers()
  )
}

function errorEvent(events: string): unknown {
  const errors = events
    .split('\n\n')
    .map((frame) => frame.replace(/^data: /, ''))
    .filter((data) => data.includes('"type":"error"'))
  return errors.length === 1 ? JSON.parse(errors[0]) : undefined
}

describe('Anthropic 400 invalid_request errors in POST /api/agent/chat', () => {
  it('tells the user to start a new chat when the prompt is too long', async () => {
    vi.mocked(anthropic.messages.stream).mockRejectedValue(
      anthropicBadRequest('prompt is too long: 215000 tokens > 200000 maximum') as never
    )

    const response = await post({ userMessage: 'Hello', model: 'claude-haiku-5-5' })

    expect(errorEvent(await response.text())).toMatchObject({
      type: 'error',
      error: 'This chat is too long for the model. Start a new chat to continue.',
      code: 'CONTEXT_TOO_LONG',
    })
  })

  it('tells the user to try a smaller image when Anthropic rejects the image', async () => {
    vi.mocked(anthropic.messages.stream).mockRejectedValue(
      anthropicBadRequest('messages.0.content.0.image.source.base64: image exceeds 5 MB maximum: 7340032 bytes > 5242880 bytes') as never
    )

    const response = await post({ userMessage: 'What is this?', model: 'claude-haiku-5-5' })

    expect(errorEvent(await response.text())).toMatchObject({
      type: 'error',
      error: 'That image is too large or unsupported. Try a smaller image.',
      code: 'IMAGE_INVALID',
    })
  })

  it('falls back to a start-a-new-chat message for any other invalid request', async () => {
    vi.mocked(anthropic.messages.stream).mockRejectedValue(
      anthropicBadRequest('messages.1: tool_use ids were found without tool_result blocks immediately after') as never
    )

    const response = await post({ userMessage: 'Hello', model: 'claude-haiku-5-5' })

    expect(errorEvent(await response.text())).toMatchObject({
      type: 'error',
      error: "Claude couldn't process this request. Start a new chat and try again.",
      code: 'ANTHROPIC_INVALID_REQUEST',
    })
  })
})

describe('safety-classifier refusals in POST /api/agent/chat', () => {
  function refusedTurn() {
    return {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'message_start', message: { usage: { input_tokens: 1000, output_tokens: 1 } } }
        yield { type: 'message_delta', delta: { stop_reason: 'refusal' }, usage: { output_tokens: 5 } }
      },
      finalMessage: () =>
        Promise.resolve({
          stop_reason: 'refusal',
          stop_details: { type: 'refusal', category: 'cyber', explanation: null },
          content: [],
          usage: { input_tokens: 1000, output_tokens: 5 },
        }),
    }
  }

  it('ends the run with an error instead of a blank reply, and still bills the tokens', async () => {
    vi.mocked(anthropic.messages.stream).mockReturnValue(refusedTurn() as never)
    const [before] = await db.select().from(schema.users)

    const events = await (await post({ userMessage: 'Hello', model: 'claude-haiku-5-5' })).text()

    expect(errorEvent(events)).toEqual({
      type: 'error',
      error: 'Claude declined this request. Try rephrasing it or start a new chat.',
      code: 'MODEL_REFUSED',
    })
    expect(events).not.toContain('"type":"done"')
    const [after] = await db.select().from(schema.users)
    expect(after.creditsRemaining).toBe(before.creditsRemaining - 1)
  })
})
