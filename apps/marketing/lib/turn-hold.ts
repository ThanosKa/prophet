import { eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { errorMessage, getModelContextWindow } from '@prophet/shared'
import { chats, usageRecords } from '@/lib/db/schema'
import {
  estimateTextTokens,
  reserveCredits,
  settleCredits,
  type CreditHold,
} from '@/lib/credit-reservation'
import { writeRunRecord, type RunRequest, type TurnEnding } from '@/lib/agent/run-record'
import { logger } from '@/lib/logger'
import { calculateUsageCostInCredits, type ModelName, type TokenUsage } from '@/lib/pricing'

type HoldStore = Pick<PgDatabase<PgQueryResultHKT>, '$with' | 'with' | 'select' | 'insert' | 'update'>
type HoldDatabase = HoldStore & {
  transaction: <T>(run: (tx: HoldStore) => Promise<T>) => Promise<T>
}

/** A Turn's Hold once taken, with what every settlement of it writes and logs. */
type HoldContext = {
  db: HoldDatabase
  userId: string
  chatId: string
  model: ModelName
  holdId: string
  hold: CreditHold
  reserveCents: number
}

/** What a Turn that ended early had measured when it stopped. */
export type PartialTurn = {
  /** False before message_start: nothing was billed upstream. */
  usageReported: boolean
  /** Measured so far, with the web searches that started. */
  usage: TokenUsage
  /** Text, thinking and tool JSON, for the output estimate. */
  streamedOutput: string
  /** Reply text so far, for the Run record. */
  text: string
}

/** How a Turn ended, which is all its Hold needs to know to close. */
export type HoldOutcome =
  /** Nothing was sent to Anthropic: the whole Hold goes back and no record is written. */
  | { type: 'not_started' }
  /** The Turn reached its final message: the full cost is charged. */
  | {
      type: 'finished'
      request: RunRequest
      usage: TokenUsage
      ending: TurnEnding
      isFinalTurn: boolean
    }
  /** Stop, disconnect or error: charged from what was measured, up to the Hold. */
  | { type: 'unfinished'; request: RunRequest; partial: PartialTurn }

/** A taken Hold. However the Turn ends, closing it is the only way to settle it. */
export type TurnHold = {
  readonly reserveCents: number
  /**
   * Settles the Hold for `outcome`. Succeeds at most once: any later call does nothing
   * and returns null. A `finished` close whose transaction fails throws and leaves the
   * Hold open for an `unfinished` close. `not_started` and `unfinished` never throw;
   * on failure they log, keep the Hold and return null.
   */
  close(outcome: HoldOutcome): Promise<{ chargedCents: number } | null>
}

/**
 * Before message_start nothing was billed upstream, so the hold goes back in full.
 * After it, output usage only arrives with the final message_delta, so the
 * streamed text stands in for it; a deliberate disconnect cannot dodge it.
 * Never throws: on failure it logs, keeps the Hold and returns null.
 */
async function settleUnfinishedTurn({
  context: { db, userId, chatId, model, holdId, hold, reserveCents },
  request,
  partial,
}: {
  context: HoldContext
  request: RunRequest
  partial: PartialTurn
}): Promise<number | null> {
  const { inputTokens, cacheCreationInputTokens, cacheReadInputTokens } = partial.usage
  const outputTokens = Math.max(partial.usage.outputTokens, estimateTextTokens(partial.streamedOutput))
  const actualCents = partial.usageReported
    ? Math.min(
        reserveCents,
        calculateUsageCostInCredits(model, { ...partial.usage, outputTokens })
      )
    : 0
  try {
    await db.transaction(async (tx) => {
      // Stop, disconnect or error released no tool calls: only the text so far.
      await writeRunRecord({
        tx,
        chatId,
        request,
        ending: { type: 'reply', text: partial.text, releasedToolCalls: [] },
        model,
        usage: { inputTokens, outputTokens, costCents: actualCents },
      })
      await settleCredits({ db: tx, userId, hold, actualCents })
      if (actualCents > 0) {
        await tx.insert(usageRecords).values({
          userId,
          inputTokens,
          cacheCreationInputTokens,
          cacheReadInputTokens,
          outputTokens,
          costCents: actualCents,
          model,
        })
      }
    })
    return actualCents
  } catch (settleError) {
    logger.error(
      {
        userId,
        chatId,
        holdId,
        reserveCents,
        actualCents,
        error: errorMessage(settleError),
      },
      'Failed to settle credit reservation; hold kept'
    )
    return null
  }
}

/**
 * The billing transaction of a Turn that reached its final message: the full cost,
 * which may exceed the Hold. Throws when the transaction fails, keeping the Hold.
 */
async function settleFinishedTurn({
  context: { db, userId, chatId, model, hold },
  request,
  ending,
  usage,
  isFinalTurn,
}: {
  context: HoldContext
  request: RunRequest
  ending: TurnEnding
  usage: TokenUsage
  isFinalTurn: boolean
}): Promise<number> {
  const { inputTokens, cacheCreationInputTokens, cacheReadInputTokens, outputTokens } = usage
  const costCents = calculateUsageCostInCredits(model, usage)
  const maxContextTokens = getModelContextWindow(model)
  await db.transaction(async (tx) => {
    // Locks the chat row, so it goes before settlement locks the user row.
    await writeRunRecord({
      tx,
      chatId,
      request,
      ending,
      model,
      usage: { inputTokens, outputTokens, costCents },
    })

    await settleCredits({ db: tx, userId, hold, actualCents: costCents })

    // Always record usage for billing audit trail
    await tx.insert(usageRecords).values({
      userId,
      inputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
      outputTokens,
      costCents,
      model,
    })

    // Update context tokens on final turn only
    if (isFinalTurn) {
      const promptTokens = inputTokens + cacheCreationInputTokens + cacheReadInputTokens
      const newContextTokens = Math.min(promptTokens + outputTokens, maxContextTokens)
      await tx
        .update(chats)
        .set({
          contextTokens: newContextTokens,
          contextInputTokens: promptTokens,
          contextOutputTokens: outputTokens,
          contextCachedInputTokens: cacheReadInputTokens,
          updatedAt: new Date(),
        })
        .where(eq(chats.id, chatId))
    }
  })
  return costCents
}

/**
 * Gives the whole Hold back when the Turn failed before anything was sent to
 * Anthropic. Never throws: on failure it logs, keeps the Hold and returns null.
 */
async function returnUnstartedHold({
  context: { db, userId, chatId, holdId, hold, reserveCents },
}: {
  context: HoldContext
}): Promise<number | null> {
  return settleCredits({ db, userId, hold, actualCents: 0 }).then(
    () => 0,
    (settleError: unknown) => {
      logger.error(
        { userId, chatId, holdId, reserveCents, error: errorMessage(settleError) },
        'Failed to return the hold of a Turn that never started; hold kept'
      )
      return null
    }
  )
}

function settle({ context, outcome }: { context: HoldContext; outcome: HoldOutcome }): Promise<number | null> {
  switch (outcome.type) {
    case 'not_started':
      return returnUnstartedHold({ context })
    case 'finished':
      return settleFinishedTurn({ context, ...outcome })
    case 'unfinished':
      return settleUnfinishedTurn({ context, ...outcome })
  }
}

/**
 * Takes a Turn's Hold and logs it. Every Hold is logged when taken and again when
 * settled, under one id. A Worker that dies mid-Turn (memory, CPU, restart) settles
 * nothing and logs nothing, so a taken Hold with no settled line is a lost Hold to
 * return by hand. Returns null when the balance can't cover the Hold, which means
 * another request holds part of it.
 */
export async function takeHold({
  db,
  userId,
  chatId,
  model,
  reserveCents,
}: {
  db: HoldDatabase
  userId: string
  chatId: string
  model: ModelName
  reserveCents: number
}): Promise<TurnHold | null> {
  const hold = await reserveCredits({ db, userId, reserveCents })
  if (!hold) return null
  const holdId = crypto.randomUUID()
  logger.info({ userId, chatId, holdId, reserveCents, ...hold }, 'Credit hold taken')
  const context: HoldContext = { db, userId, chatId, model, holdId, hold, reserveCents }

  let closed = false
  return {
    reserveCents,
    async close(outcome) {
      if (closed) return null
      const actualCents = await settle({ context, outcome })
      if (actualCents === null) return null
      // Closed as soon as the settlement lands, so nothing after it can settle twice.
      closed = true
      logger.info({ userId, chatId, holdId, actualCents }, 'Credit hold settled')
      if (outcome.type === 'finished' && actualCents > reserveCents) {
        logger.warn(
          { userId, chatId, model, reserveCents, costCents: actualCents, inputTokens: outcome.usage.inputTokens },
          'Turn cost exceeded its Hold (cache miss or input estimate miss)'
        )
      }
      return { chargedCents: actualCents }
    },
  }
}
