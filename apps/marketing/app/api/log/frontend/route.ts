import { NextResponse } from 'next/server'
import { mkdir, appendFile } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'
import { error } from '@/types'

const LOG_DIR = join(process.cwd(), 'logs')
const LOG_FILE_PATH = join(LOG_DIR, 'frontend.txt')

const frontendLogSchema = z.object({
  chatId: z.string().min(1),
  event: z.enum([
    'user_message',
    'tool_start',
    'tool_complete',
    'tool_error',
    'assistant_stream',
    'assistant_final',
  ]),
  text: z.string().min(1),
  timestamp: z.string().optional(),
})

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(error('Not available', 'FORBIDDEN'), { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(error('Invalid JSON', 'VALIDATION_ERROR'), { status: 400 })
  }

  const parsed = frontendLogSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      error('Invalid request body', 'VALIDATION_ERROR', parsed.error.issues),
      { status: 400 }
    )
  }

  const { chatId, event, text, timestamp } = parsed.data
  const ts = timestamp ?? new Date().toISOString()

  try {
    await mkdir(LOG_DIR, { recursive: true })
    const block = `\n===================================================================================================\n${ts}\nCHAT: ${chatId}\nEVENT: ${event}\n---------------------------------------------------------------------------------------------------\n${text}\n`
    await appendFile(LOG_FILE_PATH, block, 'utf-8')
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      error(
        'Failed to write log',
        'INTERNAL_ERROR',
        err instanceof Error ? err.message : String(err)
      ),
      { status: 500 }
    )
  }
}


