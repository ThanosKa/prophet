import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
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
// A plain vi.fn, so tests can hand it stub streams without casting to MessageStream.
const { streamMock } = vi.hoisted(() => ({ streamMock: vi.fn() }))

vi.mock('@/lib/anthropic', () => ({ anthropic: { messages: { stream: streamMock } } }))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/dev-logger', () => ({
  devLogger: { logRequest: vi.fn(), logResponse: vi.fn() },
}))

const { db } = await import('@/lib/db')
const { auth } = await import('@clerk/nextjs/server')
const { checkRateLimit } = await import('@/lib/ratelimit')

const USER_ID = 'user_limits'
const CHAT_ID = '3b8e1d4f-6a2c-4f9e-8d7b-5c1a2e3f4b6d'
const URL_ = 'http://localhost:3000/api/agent/chat'

beforeAll(async () => {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
})

beforeEach(async () => {
  vi.clearAllMocks()
  await db.delete(schema.users)
  vi.mocked(auth).mockResolvedValue({ userId: USER_ID } as never)
  vi.mocked(checkRateLimit).mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 60 })
  await db.insert(schema.users).values({ id: USER_ID, email: 'limits@example.com', creditsRemaining: 1_000_000 })
  await db.insert(schema.chats).values({ id: CHAT_ID, userId: USER_ID, title: 'Chat' })
})

function post(body: Record<string, unknown>) {
  return POST(
    new Request(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: CHAT_ID, ...body }),
    })
  )
}

describe('request size in POST /api/agent/chat', () => {
  it('turns away a body whose Content-Length is over 4,000,000 bytes before reading it', async () => {
    const response = await POST(
      new Request(URL_, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': '4000001' },
        body: JSON.stringify({ chatId: CHAT_ID, userMessage: 'Hi' }),
      })
    )

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'REQUEST_TOO_LARGE', error: expect.any(String) })
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('measures the body in bytes when there is no Content-Length', async () => {
    // 2,100,000 two-byte characters: under the limit in chars, over it in bytes.
    const body = JSON.stringify({ chatId: CHAT_ID, userMessage: 'é'.repeat(2_100_000) })
    const request = new Request(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
    expect(request.headers.get('content-length')).toBeNull()

    const response = await POST(request)

    expect(response.status).toBe(413)
    expect(await response.json()).toMatchObject({ code: 'REQUEST_TOO_LARGE', error: expect.any(String) })
  })
})
