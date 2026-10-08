import { and, asc, desc, eq, gt, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { parseStoredToolCalls, type AgentTurn, type StoredToolCall } from '@prophet/shared'
import { chats, messages } from '@/lib/db/schema'

type RecordStore = Pick<PgDatabase<PgQueryResultHKT>, 'select' | 'insert' | 'update'>
type RecordDatabase = { transaction: <T>(run: (tx: RecordStore) => Promise<T>) => Promise<T> }

export type HistoryRow = Pick<typeof messages.$inferSelect, 'role' | 'content' | 'toolCalls'>
export type RunOpening = { id: string; createdAt: Date }

/** Takes the chat row's lock; every transaction that writes a Run's record takes it first. */
async function lockChat({ tx, chatId }: { tx: RecordStore; chatId: string }): Promise<void> {
  await tx.select({ id: chats.id }).from(chats).where(eq(chats.id, chatId)).for('update')
}

async function readHistory({ tx, chatId }: { tx: RecordStore; chatId: string }) {
  return tx
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      toolCalls: messages.toolCalls,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt))
}

/**
 * Starts a Run: under the chat lock, re-reads the history the prompt is built from and
 * saves the opening message. `clock_timestamp()` rather than `now()` keeps rows in their
 * real order when several transactions queue on the lock.
 */
export async function openRun({
  db,
  chatId,
  userMessage,
}: {
  db: RecordDatabase
  chatId: string
  userMessage: string
}): Promise<{ history: HistoryRow[]; opening: RunOpening }> {
  return db.transaction(async (tx) => {
    await lockChat({ tx, chatId })
    const history = await readHistory({ tx, chatId })
    const [opening] = await tx
      .insert(messages)
      .values({
        chatId,
        role: 'user',
        content: userMessage,
        model: null,
        inputTokens: 0,
        outputTokens: 0,
        costCents: 0,
        createdAt: sql`clock_timestamp()`,
      })
      .returning({ id: messages.id, createdAt: messages.createdAt })
    return { history, opening }
  })
}

/** Stands in for a refused Turn's text and tool calls in the Run's record. */
export const DECLINED_NOTE = 'Claude declined to continue this request.'

/**
 * A continuation that names its Run by `runId` goes on only while that Run is live: its
 * opening is the chat's newest user row. Its prompt is built from the rows up to and
 * including the opening, so nothing another Run wrote later can slip in. Returns null
 * once a newer Run has started (or the id isn't one of the chat's user rows).
 */
export function resumeRun<Row extends HistoryRow & RunOpening>({
  history,
  runId,
}: {
  history: Row[]
  runId: string
}): { opening: RunOpening; history: Row[] } | null {
  const openingIndex = history.reduce((newest, row, index) => (row.role === 'user' ? index : newest), -1)
  const opening = history[openingIndex]
  if (!opening || opening.id !== runId) return null
  return {
    opening: { id: opening.id, createdAt: opening.createdAt },
    history: history.slice(0, openingIndex + 1),
  }
}

/** Which request of a Run this is, as far as its record is concerned. */
export type RunRequest =
  | { type: 'first'; opening: RunOpening }
  /** Names its Run by `runId` and sends every earlier Turn, so the record is recomputed. */
  | { type: 'run'; opening: RunOpening; turns: AgentTurn[] }
  /** Sends every earlier Turn of the Run (`previousTurns`), so the record is recomputed. */
  | { type: 'continuation'; turns: AgentTurn[] }
  /** Builds older than 1.0.5 send only the latest Turn, so the record is appended to. */
  | { type: 'legacy'; turns: AgentTurn[] }

export type TurnEnding =
  | { type: 'reply'; text: string; releasedToolCalls: StoredToolCall[] }
  | { type: 'refused' }

type RunRecord = { content: string; toolCalls: StoredToolCall[] }

export function isToolInput(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** The live view separates Turns' text with a newline; a reloaded record matches it. */
function appendText({ content, text }: { content: string; text: string }): string {
  if (text.trim() === '') return content
  if (content === '') return text
  return `${content}\n${text}`
}

function erroredToolCallIds(turns: AgentTurn[]): Set<string> {
  return new Set(
    turns.flatMap((turn) =>
      turn.toolResults.filter((result) => result.is_error === true).map((result) => result.tool_use_id)
    )
  )
}

function markErrors({
  toolCalls,
  errored,
}: {
  toolCalls: StoredToolCall[]
  errored: Set<string>
}): StoredToolCall[] {
  return toolCalls.map((call) => (errored.has(call.id) ? { ...call, isError: true } : call))
}

function requestToolCalls(turns: AgentTurn[]): StoredToolCall[] {
  const calls = turns.flatMap((turn) =>
    turn.content.flatMap((block) =>
      block.type === 'tool_use'
        ? [{ type: 'tool_use' as const, id: block.id, name: block.name, input: block.input }]
        : []
    )
  )
  return markErrors({ toolCalls: calls, errored: erroredToolCallIds(turns) })
}

function recordFromTurns(turns: AgentTurn[]): RunRecord {
  const content = turns.reduce(
    (text, turn) =>
      appendText({
        content: text,
        text: turn.content.map((block) => (block.type === 'text' ? block.text : '')).join(''),
      }),
    ''
  )
  return { content, toolCalls: requestToolCalls(turns) }
}

function startsWith({ ids, prefix }: { ids: string[]; prefix: string[] }): boolean {
  return prefix.length <= ids.length && prefix.every((id, index) => ids[index] === id)
}

/**
 * Without a `runId`, the newest user row may open another panel's Run. A stored row is
 * this Run's only when its calls lead up to the request's: a prefix of every earlier
 * Turn's calls, or for legacy builds ending with the latest Turn's. A request with calls
 * can't be vouched for by a row with no calls, nor by no row at all: the newest user row
 * may then open a Run whose first Turn is still streaming, so the record is left alone.
 * `stored` is null when the Run has no assistant row yet.
 */
function isThisRunsRecord({ request, stored }: { request: RunRequest; stored: StoredToolCall[] | null }): boolean {
  const requestIds = request.type === 'first' ? [] : requestToolCalls(request.turns).map((call) => call.id)
  if (stored === null) return request.type === 'first' || request.type === 'run' || requestIds.length === 0
  const storedIds = stored.map((call) => call.id)
  if (requestIds.length > 0 && storedIds.length === 0) return false
  if (request.type === 'legacy') {
    return startsWith({ ids: [...storedIds].reverse(), prefix: [...requestIds].reverse() })
  }
  return startsWith({ ids: requestIds, prefix: storedIds })
}

function baseRecord({ request, stored }: { request: RunRequest; stored: RunRecord | null }): RunRecord {
  if (request.type === 'first') return { content: '', toolCalls: [] }
  if (request.type === 'legacy' && stored) {
    return {
      content: stored.content,
      toolCalls: markErrors({ toolCalls: stored.toolCalls, errored: erroredToolCallIds(request.turns) }),
    }
  }
  return recordFromTurns(request.turns)
}

function applyEnding({ record, ending }: { record: RunRecord; ending: TurnEnding }): RunRecord {
  if (ending.type === 'refused') {
    return { content: appendText({ content: record.content, text: DECLINED_NOTE }), toolCalls: record.toolCalls }
  }
  return {
    content: appendText({ content: record.content, text: ending.text }),
    toolCalls: [...record.toolCalls, ...ending.releasedToolCalls],
  }
}

/**
 * The live Run is the chat's newest user row. A request that knows its opening (a first
 * Turn, or a continuation with `runId`) is superseded once that row isn't the newest;
 * one that doesn't can only take the newest row as its opening.
 */
async function findLiveOpening({
  tx,
  chatId,
  request,
}: {
  tx: RecordStore
  chatId: string
  request: RunRequest
}): Promise<{ status: 'live'; opening: RunOpening } | { status: 'superseded' } | { status: 'none' }> {
  const [newestUserRow] = await tx
    .select({ id: messages.id, createdAt: messages.createdAt })
    .from(messages)
    .where(and(eq(messages.chatId, chatId), eq(messages.role, 'user')))
    .orderBy(desc(messages.createdAt))
    .limit(1)
  if (request.type === 'first' || request.type === 'run') {
    return newestUserRow?.id === request.opening.id
      ? { status: 'live', opening: request.opening }
      : { status: 'superseded' }
  }
  return newestUserRow ? { status: 'live', opening: newestUserRow } : { status: 'none' }
}

/**
 * Saves a Turn's progress into its Run's single assistant row: the first assistant row
 * after the Run's opening row, inserted by the first Turn with anything to show. Locks
 * the chat row, so call it before anything that locks the user row. A superseded Run
 * writes nothing; its caller still settles the Turn's billing.
 */
export async function writeRunRecord({
  tx,
  chatId,
  request,
  ending,
  model,
  usage,
}: {
  tx: RecordStore
  chatId: string
  request: RunRequest
  ending: TurnEnding
  model: string
  usage: { inputTokens: number; outputTokens: number; costCents: number }
}): Promise<void> {
  await lockChat({ tx, chatId })
  const live = await findLiveOpening({ tx, chatId, request })
  if (live.status !== 'live') return
  const { opening } = live

  const [row] = await tx
    .select({ id: messages.id, content: messages.content, toolCalls: messages.toolCalls })
    .from(messages)
    .where(
      and(
        eq(messages.chatId, chatId),
        eq(messages.role, 'assistant'),
        gt(messages.createdAt, opening.createdAt)
      )
    )
    .orderBy(asc(messages.createdAt))
    .limit(1)
  const stored = row ? { content: row.content, toolCalls: parseStoredToolCalls(row.toolCalls) } : null
  if (!isThisRunsRecord({ request, stored: stored?.toolCalls ?? null })) return

  const record = applyEnding({ record: baseRecord({ request, stored }), ending })
  const toolCalls = record.toolCalls.length > 0 ? JSON.stringify(record.toolCalls) : null

  if (!row) {
    if (record.content === '' && record.toolCalls.length === 0) return
    await tx.insert(messages).values({
      chatId,
      role: 'assistant',
      content: record.content,
      toolCalls,
      model,
      ...usage,
      createdAt: sql`clock_timestamp()`,
    })
    return
  }

  await tx
    .update(messages)
    .set({
      content: record.content,
      toolCalls,
      model,
      inputTokens: sql`coalesce(${messages.inputTokens}, 0) + ${usage.inputTokens}`,
      outputTokens: sql`coalesce(${messages.outputTokens}, 0) + ${usage.outputTokens}`,
      costCents: sql`coalesce(${messages.costCents}, 0) + ${usage.costCents}`,
    })
    .where(eq(messages.id, row.id))
}
