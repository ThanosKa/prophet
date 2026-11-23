import { vi, type Mock } from 'vitest'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { asc, eq, sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import type { checkRateLimit } from '@/lib/ratelimit'

export {
  anthropicTurn,
  blockEvents,
  DEFAULT_USAGE,
  openableGate,
  text,
  textBlockEvents,
  toolUse,
  toolUseBlockEvents,
} from './anthropic-stream-stubs'
export type { ApiBlock, StopReason, Usage } from './anthropic-stream-stubs'

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ userId: string | null }>>(),
  checkRateLimit: vi.fn<typeof checkRateLimit>(),
  stream: vi.fn(),
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  logRequest: vi.fn(),
}))

vi.mock('@/lib/db', async () => {
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dbSchema = await import('@/lib/db/schema')
  return { db: drizzle(new PGlite(), { schema: dbSchema }) }
})
vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth }))
vi.mock('@/lib/ratelimit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@/lib/anthropic', () => ({ anthropic: { messages: { stream: mocks.stream } } }))
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }))
vi.mock('@/lib/dev-logger', () => ({ devLogger: { logRequest: mocks.logRequest, logResponse: vi.fn() } }))

const { db } = await import('@/lib/db')
const { POST } = await import('./route')

export { db }
export const streamMock: Mock = mocks.stream
export const loggerMock: Record<'debug' | 'info' | 'warn' | 'error', Mock> = mocks.logger
export const logRequestMock: Mock = mocks.logRequest

export async function createTables(): Promise<void> {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
}

export async function resetAs(userId: string): Promise<void> {
  vi.clearAllMocks()
  await db.delete(schema.users)
  mocks.auth.mockResolvedValue({ userId })
  mocks.checkRateLimit.mockResolvedValue({ success: true, limit: 60, remaining: 59, reset: 60 })
}

export async function seedUserWithChat({
  userId,
  chatId,
  credits,
  purchased = 0,
  tier = 'free',
}: {
  userId: string
  chatId: string
  credits: number
  purchased?: number
  tier?: 'free' | 'pro' | 'premium' | 'ultra'
}): Promise<void> {
  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@example.com`,
    creditsRemaining: credits,
    purchasedCredits: purchased,
    tier,
  })
  await db.insert(schema.chats).values({ id: chatId, userId, title: 'Chat' })
}

export const AGENT_CHAT_URL = 'http://localhost:3000/api/agent/chat'

export function postAgentChat(body: Record<string, unknown>): Promise<Response> {
  return POST(
    new Request(AGENT_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

export function postRaw(request: Request): Promise<Response> {
  return POST(request)
}

export type Frame = { type: string } & Record<string, unknown>

function isFrame(value: unknown): value is Frame {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
}

export function frames(events: string): Frame[] {
  return events
    .split('\n\n')
    .filter(Boolean)
    .map((frame): unknown => JSON.parse(frame.replace(/^data: /, '')))
    .filter(isFrame)
}

export async function readUntil({
  response,
  marker,
}: {
  response: Response
  marker: string
}): Promise<{ reader: ReadableStreamDefaultReader<Uint8Array>; seen: string }> {
  if (!response.body) throw new Error('no response body')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let seen = ''
  while (!seen.includes(marker)) {
    const { value, done } = await reader.read()
    if (done) throw new Error(`stream ended before ${marker}`)
    seen += decoder.decode(value)
  }
  return { reader, seen }
}

export async function readToEnd(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<void> {
  for (;;) {
    const { done } = await reader.read()
    if (done) return
  }
}

export function sentParams(call = 0) {
  const params = streamMock.mock.calls[call]?.[0]
  if (!params) throw new Error(`no Anthropic call #${call}`)
  return params
}

export async function storedMessages(
  chatId: string
): Promise<Array<{ role: string; content: string; toolCalls: unknown }>> {
  const rows = await db.query.messages.findMany({
    where: eq(schema.messages.chatId, chatId),
    orderBy: [asc(schema.messages.createdAt)],
  })
  return rows.map(({ role, content, toolCalls }) => ({
    role,
    content,
    toolCalls: toolCalls === null ? null : JSON.parse(toolCalls),
  }))
}

export async function balance(userId: string): Promise<number | undefined> {
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, userId) })
  return row?.creditsRemaining
}
