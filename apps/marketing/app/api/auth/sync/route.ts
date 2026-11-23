import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { ensureDbUser } from '@/lib/db/user'
import { error, INTERNAL_ERROR_MESSAGE, SESSION_EXPIRED_MESSAGE } from '@/types'

export async function POST() {
  try {
    await ensureDbUser()
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ error: err }, 'Failed to sync user')
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json(error({ message: SESSION_EXPIRED_MESSAGE, code: 'UNAUTHORIZED' }), { status: 401 })
    }
    return NextResponse.json(error({ message: INTERNAL_ERROR_MESSAGE, code: 'INTERNAL_ERROR' }), { status: 500 })
  }
}
