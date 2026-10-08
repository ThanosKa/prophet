import type { MessageParam, ToolUnion } from '@anthropic-ai/sdk/resources/messages'
import { and, eq, gte, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema'
import { calculateCostInCredits, type ModelName } from '@/lib/pricing'

type CreditStore = Pick<PgDatabase<PgQueryResultHKT>, 'update'>

/**
 * Deliberately pessimistic: 2 ASCII bytes per token covers English (~3.5 bytes/token),
 * code and accessibility snapshots (~1.9); 2 tokens per non-ASCII character covers
 * Greek (~1.7 tokens/char), CJK (~1.4) and Cyrillic, all measured with the published
 * tokenizer x1.35 (the Opus 4.7+ inflation bound). Bytes alone undercount Greek, whose
 * letters are 2 bytes but ~1.7 tokens. Over-estimating only makes the hold temporarily
 * larger; under-estimating lets a turn settle above its hold.
 */
const ASCII_BYTES_PER_TOKEN = 2
const TOKENS_PER_NON_ASCII_CHAR = 2
// Tool-use system prompt Anthropic injects (346 tokens on Claude 4) x1.35, rounded up.
const REQUEST_OVERHEAD_TOKENS = 500
// High-res vision caps an image at ~4784 tokens on Claude 5 models.
const IMAGE_TOKEN_ALLOWANCE = 4800

function isImageBlock(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'image'
  )
}

export function estimateTextTokens(text: string): number {
  let asciiChars = 0
  let nonAsciiChars = 0
  for (const char of text) {
    if (char.charCodeAt(0) < 0x80) asciiChars++
    else nonAsciiChars++
  }
  return Math.ceil(asciiChars / ASCII_BYTES_PER_TOKEN + nonAsciiChars * TOKENS_PER_NON_ASCII_CHAR)
}

export function estimateInputTokens({
  system,
  tools,
  messages,
}: {
  system: string
  tools: ToolUnion[]
  messages: MessageParam[]
}): number {
  let images = 0
  const serialized = JSON.stringify({ system, tools, messages }, (_key, value: unknown) => {
    if (!isImageBlock(value)) return value
    images += 1
    return undefined
  })

  return (
    estimateTextTokens(serialized) +
    images * IMAGE_TOKEN_ALLOWANCE +
    REQUEST_OVERHEAD_TOKENS
  )
}

export type CreditReservationPlan =
  | { ok: true; reserveCents: number; maxTokens: number }
  | { ok: false; reason: 'INSUFFICIENT_BALANCE'; requiredCents: number }

export function planCreditReservation({
  model,
  balanceCents,
  estimatedInputTokens,
  maxTokens,
  minTokens,
  webSearchMaxUses,
}: {
  model: ModelName
  balanceCents: number
  estimatedInputTokens: number
  maxTokens: number
  minTokens: number
  webSearchMaxUses: number
}): CreditReservationPlan {
  const costWith = (outputTokens: number) =>
    calculateCostInCredits(model, estimatedInputTokens, outputTokens, webSearchMaxUses)

  const floorCents = costWith(minTokens)
  if (floorCents > balanceCents) {
    return { ok: false, reason: 'INSUFFICIENT_BALANCE', requiredCents: floorCents }
  }

  const fullCents = costWith(maxTokens)
  if (fullCents <= balanceCents) {
    return { ok: true, reserveCents: fullCents, maxTokens }
  }

  // Cost is monotonic in output tokens, so binary-search the billing function itself
  // rather than inverting it: the reserve then matches settle's rounding exactly.
  let affordable = minTokens
  let unaffordable = maxTokens
  while (unaffordable - affordable > 1) {
    const mid = Math.floor((affordable + unaffordable) / 2)
    if (costWith(mid) <= balanceCents) affordable = mid
    else unaffordable = mid
  }

  return { ok: true, reserveCents: costWith(affordable), maxTokens: affordable }
}

/**
 * Takes the hold in one statement: Postgres re-checks the WHERE guard after waiting
 * on a concurrent writer's row lock, so parallel requests can never jointly reserve
 * more than the balance.
 */
export async function reserveCredits({
  db,
  userId,
  reserveCents,
}: {
  db: CreditStore
  userId: string
  reserveCents: number
}): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      creditsRemaining: sql`${users.creditsRemaining} - ${reserveCents}`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), gte(users.creditsRemaining, reserveCents)))
    .returning({ creditsRemaining: users.creditsRemaining })
  return rows.length > 0
}

export async function settleCredits({
  db,
  userId,
  reserveCents,
  actualCents,
}: {
  db: CreditStore
  userId: string
  reserveCents: number
  actualCents: number
}): Promise<void> {
  await db
    .update(users)
    .set({
      creditsRemaining: sql`${users.creditsRemaining} + ${reserveCents - actualCents}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}
