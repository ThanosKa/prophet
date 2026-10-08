/**
 * Shared harness for the agent chat route tests that run on an in-memory Postgres
 * (pglite). Importing it mocks the route's collaborators: the database, Clerk, the rate
 * limiter, Anthropic and the loggers. Each test file gets its own pglite instance,
 * because Vitest isolates modules per file.
 */
import { vi, type Mock } from 'vitest'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { asc, eq, sql } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import type { checkRateLimit } from '@/lib/ratelimit'

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ userId: string | null }>>(),
  checkRateLimit: vi.fn<typeof checkRateLimit>(),
  // A plain vi.fn, so tests can hand it stub streams without casting to MessageStream.
  stream: vi.fn(),
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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
vi.mock('@/lib/dev-logger', () => ({ devLogger: { logRequest: vi.fn(), logResponse: vi.fn() } }))

const { db } = await import('@/lib/db')
const { POST } = await import('./route')

export { db }
export const streamMock: Mock = mocks.stream
export const loggerMock: Record<'debug' | 'info' | 'warn' | 'error', Mock> = mocks.logger

/** Creates the tables from the Drizzle schema; no migration files are involved. */
export async function createTables(): Promise<void> {
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema))
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
}

/** Clears every mock and every user (chats, messages and usage cascade), then signs `userId` in. */
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

export type ApiBlock = { type: string } & Record<string, unknown>
export type StopReason = 'tool_use' | 'end_turn' | 'max_tokens' | 'refusal' | 'pause_turn'
export type Usage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export const text = (value: string): ApiBlock => ({ type: 'text', text: value })

export const toolUse = ({
  id,
  name,
  input,
}: {
  id: string
  name: string
  input: Record<string, unknown>
}): ApiBlock => ({ type: 'tool_use', id, name, input })

/** The stream events Anthropic sends for one finished content block. */
export function* blockEvents({ index, block }: { index: number; block: ApiBlock }) {
  if (block.type === 'tool_use') {
    yield { type: 'content_block_start', index, content_block: { ...block, input: {} } }
    yield {
      type: 'content_block_delta',
      index,
      delta: { type: 'input_json_delta', partial_json: JSON.stringify(block.input) },
    }
  } else if (block.type === 'text') {
    yield { type: 'content_block_start', index, content_block: { type: 'text', text: '' } }
    yield { type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.text } }
  } else {
    yield { type: 'content_block_start', index, content_block: block }
  }
  yield { type: 'content_block_stop', index }
}

/** One streamed text block: start, a single delta, stop. */
export function* textBlockEvents({ index, value }: { index: number; value: string }) {
  yield* blockEvents({ index, block: text(value) })
}

/** One streamed client tool call; `partialJson` lets a test cut the input off mid-way. */
export function* toolUseBlockEvents({
  index,
  id,
  name,
  partialJson,
}: {
  index: number
  id: string
  name: string
  partialJson: string
}) {
  yield { type: 'content_block_start', index, content_block: { type: 'tool_use', id, name, input: {} } }
  yield { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: partialJson } }
  yield { type: 'content_block_stop', index }
}

export const DEFAULT_USAGE: Usage = { input_tokens: 1000, output_tokens: 50 }

/**
 * One Anthropic response: streams `content` (or the given block `events`), then reports
 * `content` from finalMessage(). With a `gate`, the Turn stays in flight until it opens.
 */
export function anthropicTurn({
  content,
  stopReason,
  usage = DEFAULT_USAGE,
  events,
  gate,
}: {
  content: ApiBlock[]
  stopReason: StopReason
  usage?: Usage
  events?: Iterable<Record<string, unknown>>
  gate?: Promise<void>
}) {
  return {
    [Symbol.asyncIterator]: async function* () {
      yield { type: 'message_start', message: { usage: { ...usage, output_tokens: 1 } } }
      if (events) yield* events
      else for (const [index, block] of content.entries()) yield* blockEvents({ index, block })
      if (gate) await gate
      yield { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: usage.output_tokens } }
    },
    finalMessage: () =>
      Promise.resolve({
        stop_reason: stopReason,
        ...(stopReason === 'refusal' && {
          stop_details: { type: 'refusal', category: 'cyber', explanation: null },
        }),
        content,
        usage,
      }),
  }
}

export function openableGate(): { gate: Promise<void>; open: () => void } {
  let open = () => {}
  const gate = new Promise<void>((resolve) => {
    open = resolve
  })
  return { gate, open }
}

export type Frame = { type: string } & Record<string, unknown>

function isFrame(value: unknown): value is Frame {
  return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string'
}

/** Parses an SSE body into its `data:` frames. */
export function frames(events: string): Frame[] {
  return events
    .split('\n\n')
    .filter(Boolean)
    .map((frame): unknown => JSON.parse(frame.replace(/^data: /, '')))
    .filter(isFrame)
}

/** Reads the response until `marker` shows up and hands back the reader for the rest. */
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

/** The params of the route's `call`-th Anthropic request (typed loosely, for assertions). */
export function sentParams(call = 0) {
  const params = streamMock.mock.calls[call]?.[0]
  if (!params) throw new Error(`no Anthropic call #${call}`)
  return params
}

/** The chat's rows in order, with tool calls parsed from their JSON column. */
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
