import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { ensureDbUser } from '@/lib/db/user'

export async function POST() {
  try {
    await ensureDbUser()
    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error({ error }, 'Failed to sync user')
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync user' },
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    )
  }
}
