import { eq } from 'drizzle-orm'
import { errorMessage, getModelContextWindow } from '@prophet/shared'
import type { Database } from '@/lib/db/client'
import { chats, usageRecords } from '@/lib/db/schema'
import { estimateTextTokens, settleCredits, type CreditHold } from '@/lib/credit-reservation'
import { writeRunRecord, type RunRequest, type TurnEnding } from '@/lib/agent/run-record'
import { logger } from '@/lib/logger'
import { calculateUsageCostInCredits, type ModelName, type TokenUsage } from '@/lib/pricing'

/** A Turn's Hold once taken, with what every settlement of it writes and logs. */
export type HoldContext = {
  db: Database
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

function logHoldSettled({
  userId,
  chatId,
  holdId,
  actualCents,
}: {
  userId: string
  chatId: string
  holdId: string
  actualCents: number
}): void {
  logger.info({ userId, chatId, holdId, actualCents }, 'Credit hold settled')
}

/**
 * Runs on every path that did not reach the billing transaction. Before
 * message_start nothing was billed upstream, so the hold goes back in full.
 * After it, output usage only arrives with the final message_delta, so the
 * streamed text stands in for it; a deliberate disconnect cannot dodge it.
 * Never throws: on failure it logs and keeps the Hold.
 */
export async function settleUnfinishedTurn({
  context: { db, userId, chatId, model, holdId, hold, reserveCents },
  request,
  partial,
}: {
  context: HoldContext
  request: RunRequest
  partial: PartialTurn
}): Promise<void> {
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
    logHoldSettled({ userId, chatId, holdId, actualCents })
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
  }
}

/**
 * The billing transaction of a Turn that reached its final message: the full cost,
 * which may exceed the Hold. Throws when the transaction fails, keeping the Hold for
 * the caller to settle as unfinished.
 */
export async function settleFinishedTurn({
  context: { db, userId, chatId, model, holdId, hold, reserveCents },
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
}): Promise<void> {
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
  logHoldSettled({ userId, chatId, holdId, actualCents: costCents })

  if (costCents > reserveCents) {
    logger.warn(
      { userId, chatId, model, reserveCents, costCents, inputTokens },
      'Turn cost exceeded its Hold (cache miss or input estimate miss)'
    )
  }
}

/**
 * Gives the whole Hold back when the Turn failed before anything was sent to
 * Anthropic. Never throws: on failure it logs and keeps the Hold.
 */
export async function returnUnstartedHold({
  context: { db, userId, chatId, holdId, hold, reserveCents },
}: {
  context: HoldContext
}): Promise<void> {
  await settleCredits({ db, userId, hold, actualCents: 0 }).then(
    () => logHoldSettled({ userId, chatId, holdId, actualCents: 0 }),
    (settleError: unknown) => {
      logger.error(
        { userId, chatId, holdId, reserveCents, error: errorMessage(settleError) },
        'Failed to return the hold of a Turn that never started; hold kept'
      )
    }
  )
}
