import type { MessageParam, ToolUnion } from '@anthropic-ai/sdk/resources/messages'
import { and, eq, gte, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { users } from '@/lib/db/schema'
import { calculateCostInCredits, type ModelName } from '@/lib/pricing'

type CreditStore = Pick<PgDatabase<PgQueryResultHKT>, 'update'>
type CreditReserveStore = Pick<PgDatabase<PgQueryResultHKT>, '$with' | 'with' | 'select'>

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

/** How much of a Turn's hold came out of each balance, so settlement can return it. */
export type CreditHold = { subscriptionCents: number; purchasedCents: number }

/**
 * Takes the hold Subscription credits first, then Purchased credits, checked against
 * their combined balance, in one UPDATE so parallel requests can never jointly
 * reserve more than the balance. The CTE locks the row and keeps its Subscription
 * credits as they were, so RETURNING can report how the hold was split.
 * Returns null when the balance can't cover the hold or the user doesn't exist.
 */
export async function reserveCredits({
  db,
  userId,
  reserveCents,
}: {
  db: CreditReserveStore
  userId: string
  reserveCents: number
}): Promise<CreditHold | null> {
  const before = db.$with('balance_before_hold').as(
    db
      .select({ subscription: users.creditsRemaining })
      .from(users)
      .where(eq(users.id, userId))
      .for('update')
  )
  // Subscription credits can be negative after an overage; they then give nothing.
  const fromSubscription = (subscription: typeof users.creditsRemaining) =>
    sql`LEAST(GREATEST(${subscription}, 0), ${reserveCents}::integer)`

  const [row] = await db
    .with(before)
    .update(users)
    .set({
      creditsRemaining: sql`${users.creditsRemaining} - ${fromSubscription(users.creditsRemaining)}`,
      purchasedCredits: sql`${users.purchasedCredits} - (${reserveCents}::integer - ${fromSubscription(users.creditsRemaining)})`,
      updatedAt: new Date(),
    })
    .from(before)
    .where(
      and(
        eq(users.id, userId),
        gte(sql`${users.creditsRemaining} + ${users.purchasedCredits}`, reserveCents),
        gte(users.purchasedCredits, sql`${reserveCents}::integer - ${fromSubscription(users.creditsRemaining)}`)
      )
    )
    .returning({ subscriptionCents: fromSubscription(before.subscription).mapWith(Number) })

  if (!row) return null
  return { subscriptionCents: row.subscriptionCents, purchasedCents: reserveCents - row.subscriptionCents }
}

/**
 * Returns the unused part of the hold Purchased credits first, so the Credits that
 * never expire last longest. A Turn that cost more than its hold takes the overage
 * from Subscription credits down to 0, then Purchased credits down to 0; only what
 * both can't cover pushes Subscription credits negative.
 */
export async function settleCredits({
  db,
  userId,
  hold,
  actualCents,
}: {
  db: CreditStore
  userId: string
  hold: CreditHold
  actualCents: number
}): Promise<void> {
  const unusedCents = hold.subscriptionCents + hold.purchasedCents - actualCents
  const refundToPurchased = Math.min(Math.max(unusedCents, 0), hold.purchasedCents)
  const refundToSubscription = Math.max(unusedCents, 0) - refundToPurchased
  const overageCents = Math.max(-unusedCents, 0)

  // Both SET expressions read the row as it was before this UPDATE.
  const overageFromSubscription = sql`LEAST(GREATEST(${users.creditsRemaining}, 0), ${overageCents}::integer)`
  const overageFromPurchased = sql`LEAST(${users.purchasedCredits}, ${overageCents}::integer - ${overageFromSubscription})`

  await db
    .update(users)
    .set({
      creditsRemaining: sql`${users.creditsRemaining} + ${refundToSubscription}::integer - (${overageCents}::integer - ${overageFromPurchased})`,
      purchasedCredits: sql`${users.purchasedCredits} + ${refundToPurchased}::integer - ${overageFromPurchased}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
}
