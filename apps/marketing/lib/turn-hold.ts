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

type HoldContext = {
  db: HoldDatabase
  userId: string
  chatId: string
  model: ModelName
  holdId: string
  hold: CreditHold
  reserveCents: number
}

export type PartialTurn = {
  usageReported: boolean
  usage: TokenUsage
  streamedOutput: string
  text: string
}

export type HoldOutcome =
  | { type: 'not_started' }
  | {
      type: 'finished'
      request: RunRequest
      usage: TokenUsage
      ending: TurnEnding
      isFinalTurn: boolean
    }
  | { type: 'unfinished'; request: RunRequest; partial: PartialTurn }

/** A taken Hold. However the Turn ends, closing it is the only way to settle it. */
export type TurnHold = {
  readonly reserveCents: number
  close(outcome: HoldOutcome): Promise<{ chargedCents: number } | null>
}

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
        calculateUsageCostInCredits({ model, usage: { ...partial.usage, outputTokens } })
      )
    : 0
  try {
    await db.transaction(async (tx) => {
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
  const costCents = calculateUsageCostInCredits({ model, usage })
  const maxContextTokens = getModelContextWindow(model)
  await db.transaction(async (tx) => {
    await writeRunRecord({
      tx,
      chatId,
      request,
      ending,
      model,
      usage: { inputTokens, outputTokens, costCents },
    })

    await settleCredits({ db: tx, userId, hold, actualCents: costCents })

    await tx.insert(usageRecords).values({
      userId,
      inputTokens,
      cacheCreationInputTokens,
      cacheReadInputTokens,
      outputTokens,
      costCents,
      model,
    })

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
