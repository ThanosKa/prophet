import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { usageRecords } from '@/lib/db/schema'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const model = searchParams.get('model')

    let whereClause = eq(usageRecords.userId, userId)

    if (from) {
      whereClause = and(whereClause, gte(usageRecords.createdAt, new Date(from))) as any
    }
    if (to) {
      whereClause = and(whereClause, lte(usageRecords.createdAt, new Date(to))) as any
    }
    if (model) {
      whereClause = and(whereClause, eq(usageRecords.model, model)) as any
    }

    const records = await db.query.usageRecords.findMany({
      where: whereClause,
      orderBy: [desc(usageRecords.createdAt)],
    })

    // Create CSV content
    const headers = ['Date', 'Model', 'Input Tokens', 'Output Tokens', 'Cost (Credits)']
    const rows = records.map(r => [
      r.createdAt.toISOString(),
      r.model,
      r.inputTokens.toString(),
      r.outputTokens.toString(),
      (r.costCents).toString(), // Credits = cents in this system
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="usage-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (err) {
    logger.error({ error: err }, 'Failed to export usage records')
    return new Response('Internal server error', { status: 500 })
  }
}

