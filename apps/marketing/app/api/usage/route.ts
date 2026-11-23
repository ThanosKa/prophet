import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { usageRecords } from '@/lib/db/schema'
import { and, asc, desc, eq, gte, lt, sql } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { dailyUsageQuerySchema, type DailyUsagePage } from '@prophet/shared'
import { error, success, INTERNAL_ERROR_MESSAGE } from '@/types'
import { logger } from '@/lib/logger'
import { checkRateLimit } from '@/lib/ratelimit'

const utcDay = sql<string>`to_char(${usageRecords.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`

// count() and sum() over integer columns return bigint, which drivers hand back as strings. https://node-postgres.com/features/types
const total = (column: AnyPgColumn) => sql`coalesce(sum(${column}), 0)`.mapWith(Number)

const startOfUtcDay = (day: string) => new Date(`${day}T00:00:00.000Z`)
const MS_PER_DAY = 24 * 60 * 60 * 1000
const startOfNextUtcDay = (day: string) => new Date(startOfUtcDay(day).getTime() + MS_PER_DAY)

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(error({ message: 'Unauthorized', code: 'UNAUTHORIZED' }), { status: 401 })
    }

    const rateLimitResult = await checkRateLimit({ userId, type: 'api' })
    if (!rateLimitResult.success) {
      return NextResponse.json(error({ message: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' }), {
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
        error({ message: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: query.error.issues }),
        { status: 400 }
      )
    }
    const { days, before, from, to } = query.data

    const scope = and(
      eq(usageRecords.userId, userId),
      before ? lt(usageRecords.createdAt, startOfUtcDay(before)) : undefined,
      from ? gte(usageRecords.createdAt, startOfUtcDay(from)) : undefined,
      to ? lt(usageRecords.createdAt, startOfNextUtcDay(to)) : undefined
    )

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
    return NextResponse.json(error({ message: INTERNAL_ERROR_MESSAGE, code: 'INTERNAL_ERROR' }), { status: 500 })
  }
}
