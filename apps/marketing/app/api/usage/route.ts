import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { usageRecords } from '@/lib/db/schema'
import { and, asc, desc, eq, gte, lt, lte, sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { dailyUsageQuerySchema, type DailyUsagePage } from '@prophet/shared'
import { error, success, INTERNAL_ERROR_MESSAGE } from '@/types'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/ratelimit'

const utcDay = sql<string>`to_char(${usageRecords.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`

// count() and sum() over integer columns return bigint, which drivers hand back as strings.
const total = (column: AnyPgColumn) => sql`coalesce(sum(${column}), 0)`.mapWith(Number)

const startOfUtcDay = (day: string) => new Date(`${day}T00:00:00.000Z`)

/** Daily usage totals per model for the signed-in user, paged by UTC day, newest first. */
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(error('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const rateLimitResult = await checkRateLimit(userId, 'api')
    if (!rateLimitResult.success) {
      return NextResponse.json(error('Too many requests', 'RATE_LIMIT_EXCEEDED'), {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '',
          'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '',
          'X-RateLimit-Reset': rateLimitResult.reset?.toString() || '',
        },
      })
    }

    const { searchParams } = new URL(req.url)
    const query = dailyUsageQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) {
      return NextResponse.json(
        error('Invalid query parameters', 'VALIDATION_ERROR', query.error.issues),
        { status: 400 }
      )
    }
    const { days, before, from, to } = query.data

    const scope = and(
      eq(usageRecords.userId, userId),
      before ? lt(usageRecords.createdAt, startOfUtcDay(before)) : undefined,
      from ? gte(usageRecords.createdAt, new Date(from)) : undefined,
      to ? lte(usageRecords.createdAt, new Date(to)) : undefined
    )

    // Pick the page's days first (one extra to learn whether older days exist), so a
    // page never splits a day's models across two pages.
    const pageDays = await db
      .select({ day: utcDay })
      .from(usageRecords)
      .where(scope)
      .groupBy(utcDay)
      .orderBy(desc(utcDay))
      .limit(days + 1)

    const hasOlderDays = pageDays.length > days
    const oldestDay = pageDays.slice(0, days).at(-1)?.day
    if (!oldestDay) {
      return NextResponse.json(success<DailyUsagePage>({ rows: [], nextBefore: null }))
    }

    const rows = await db
      .select({
        day: utcDay,
        model: usageRecords.model,
        turns: sql`count(*)`.mapWith(Number),
        inputTokens: total(usageRecords.inputTokens),
        cacheWriteTokens: total(usageRecords.cacheCreationInputTokens),
        cacheReadTokens: total(usageRecords.cacheReadInputTokens),
        outputTokens: total(usageRecords.outputTokens),
        credits: total(usageRecords.costCents),
      })
      .from(usageRecords)
      .where(and(scope, gte(usageRecords.createdAt, startOfUtcDay(oldestDay))))
      .groupBy(utcDay, usageRecords.model)
      .orderBy(desc(utcDay), asc(usageRecords.model))

    return NextResponse.json(success<DailyUsagePage>({
      rows: rows.map(row => ({
        ...row,
        tokens: row.inputTokens + row.cacheWriteTokens + row.cacheReadTokens + row.outputTokens,
      })),
      nextBefore: hasOlderDays ? oldestDay : null,
    }))
  } catch (err) {
    logger.error({ error: err }, 'Failed to fetch usage records')
    return NextResponse.json(error(INTERNAL_ERROR_MESSAGE, 'INTERNAL_ERROR'), { status: 500 })
  }
}
