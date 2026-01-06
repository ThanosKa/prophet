import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { usageRecords } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, type SQL } from 'drizzle-orm'
import { error, success } from '@/types'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(error('Unauthorized', 'UNAUTHORIZED'), { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const model = searchParams.get('model')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    let whereClause: SQL | undefined = eq(usageRecords.userId, userId)

    if (from) {
      whereClause = and(whereClause, gte(usageRecords.createdAt, new Date(from)))
    }
    if (to) {
      whereClause = and(whereClause, lte(usageRecords.createdAt, new Date(to)))
    }
    if (model) {
      whereClause = and(whereClause, eq(usageRecords.model, model))
    }

    const records = await db.query.usageRecords.findMany({
      where: whereClause,
      orderBy: [desc(usageRecords.createdAt)],
      limit,
      offset,
    })

    const totalCount = await db
      .select({ count: usageRecords.id })
      .from(usageRecords)
      .where(whereClause)
      .then(res => res.length)

    return NextResponse.json(success({
      records,
      pagination: {
        total: totalCount,
        limit,
        offset,
      }
    }))
  } catch (err) {
    logger.error({ error: err }, 'Failed to fetch usage records')
    return NextResponse.json(error('Internal server error', 'INTERNAL_ERROR'), { status: 500 })
  }
}

