import { z } from 'zod'

// Round-trips the day so rollovers like 2026-02-30 are rejected.
function isCalendarDay(day: string): boolean {
  const date = new Date(`${day}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day
}

const utcDaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a UTC day as YYYY-MM-DD')
  .refine(isCalendarDay, 'Not a calendar day')

export const DAILY_USAGE_MAX_DAYS = 90

/**
 * Query string of `GET /api/usage`: a page of `days` UTC days, strictly older than
 * `before`, optionally limited to the UTC days `from` through `to`, both inclusive.
 */
export const dailyUsageQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(DAILY_USAGE_MAX_DAYS).default(7),
  before: utcDaySchema.optional(),
  from: utcDaySchema.optional(),
  to: utcDaySchema.optional(),
})

/** Usage totals of one model on one UTC day. Credits are the Credits spent that day. */
export const dailyUsageRowSchema = z.object({
  day: utcDaySchema,
  model: z.string(),
  turns: z.number().int(),
  inputTokens: z.number().int(),
  cacheWriteTokens: z.number().int(),
  cacheReadTokens: z.number().int(),
  outputTokens: z.number().int(),
  /** input + cache write + cache read + output, so tokens and cost agree */
  tokens: z.number().int(),
  credits: z.number().int(),
})

export const dailyUsagePageSchema = z.object({
  rows: z.array(dailyUsageRowSchema),
  /** Pass as `before` to fetch the next older page; null on the oldest page. */
  nextBefore: utcDaySchema.nullable(),
})

export type DailyUsageQuery = z.infer<typeof dailyUsageQuerySchema>
export type DailyUsageRow = z.infer<typeof dailyUsageRowSchema>
export type DailyUsagePage = z.infer<typeof dailyUsagePageSchema>
