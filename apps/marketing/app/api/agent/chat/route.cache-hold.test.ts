import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'
import * as schema from '@/lib/db/schema'
import {
  anthropicTurn,
  balance as balanceOf,
  createTables,
  db,
  loggerMock,
  postAgentChat,
  resetAs,
  seedUserWithChat,
  streamMock,
  text,
  type Usage,
} from './route-test-harness'

const USER_ID = 'user_cache_hold'
const CHAT_ID = '5b2e8f1a-3c4d-4e6f-8a7b-9c0d1e2f3a4b'
const OPENING_ID = '6d1c9e2b-4f3a-4b5c-8d7e-0f1a2b3c4d5e'

beforeAll(createTables)

beforeEach(async () => {
  await resetAs(USER_ID)
})

/** A paid user mid-Run: the chat and the Run's opening user row, as Turn 1 saved it. */
async function seedRun({ credits, opening = 'Tidy my inbox' }: { credits: number; opening?: string }) {
  await seedUserWithChat({ userId: USER_ID, chatId: CHAT_ID, credits, tier: 'pro' })
  await db.insert(schema.messages).values({
    id: OPENING_ID,
    chatId: CHAT_ID,
    role: 'user',
    content: opening,
    createdAt: new Date(Date.UTC(2026, 0, 2)),
  })
}

const balance = () => balanceOf(USER_ID)

function post(body: Record<string, unknown>) {
  return postAgentChat({ chatId: CHAT_ID, ...body })
}

/** 120,000 ASCII characters of snapshot text: 60,000 estimated tokens. */
const LARGE_SNAPSHOT = '[uid=1_7] link "Re: quarterly report" href="/mail/7"\n'.repeat(2400).slice(0, 120_000)

/**
 * Turn 3 of a Sonnet 5.5 Run. Turn 1 read a large snapshot, so everything Turn 2 sent
 * (system, tools, the opening message, Turn 1 and its snapshot) is the cached prefix;
 * only Turn 2 and its short result are new.
 */
function continuationWithLargeCachedPrefix() {
  return {
    model: 'claude-sonnet-5-5',
    enableThinking: false,
    runId: OPENING_ID,
    previousTurns: [
      {
        content: [
          { type: 'text', text: 'Reading your inbox.' },
          { type: 'tool_use', id: 'toolu_1', name: 'take_snapshot', input: {} },
        ],
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: LARGE_SNAPSHOT }],
      },
      {
        content: [
          { type: 'text', text: 'Opening the report thread.' },
          { type: 'tool_use', id: 'toolu_2', name: 'click_element_by_uid', input: { uid: '1_7' } },
        ],
        toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_2', content: 'Clicked' }],
      },
    ],
  }
}

function finishedTurn(usage: Usage) {
  return anthropicTurn({ content: [text('Done.')], stopReason: 'end_turn', usage })
}

describe('cache-aware Hold in POST /api/agent/chat', () => {
  // The Hold estimates this request at 71,688 tokens: a 71,555-token cached prefix (what
  // Turn 2 sent) and 133 new ones (Turn 2 and its result). Floor at 4,096 output tokens:
  //   (71555 x $0.10 + 133 x $2.50 + 4096 x $10) / 1M = $0.048448 -> x1.25 = 6.06c -> 7 credits
  // The whole prompt as a cache write would need 28 (24 at the plain input rate).
  const CACHED_HOLD_FLOOR = 7

  it('allows a Sonnet 5.5 continuation with a large cached prefix at a balance that covers the cached cost', async () => {
    await seedRun({ credits: CACHED_HOLD_FLOOR })
    streamMock.mockReturnValue(
      finishedTurn({ input_tokens: 50, cache_creation_input_tokens: 100, cache_read_input_tokens: 70_000, output_tokens: 300 })
    )

    const response = await post(continuationWithLargeCachedPrefix())
    await response.text()

    expect(response.status).toBe(200)
    // 7 credits = $0.056 of API cost; the prompt takes $0.007488, leaving 4,851 output tokens
    expect(streamMock.mock.calls[0]?.[0].max_tokens).toBe(4851)
    // 50 x $2 + 100 x $2.50 + 70000 x $0.10 + 300 x $10 = $0.01035 -> x1.25 = 1.29c -> 2
    expect(await balance()).toBe(5)
  })

  it('answers 402 one Credit below the cached cost, without calling Anthropic', async () => {
    await seedRun({ credits: CACHED_HOLD_FLOOR - 1 })

    const response = await post(continuationWithLargeCachedPrefix())
    const body = await response.json()

    expect(response.status).toBe(402)
    expect(body).toMatchObject({ code: 'INSUFFICIENT_BALANCE', details: { isContinuation: true } })
    expect(streamMock).not.toHaveBeenCalled()
    expect(await balance()).toBe(CACHED_HOLD_FLOOR - 1)
  })

  it('prices the legacy single-Turn form as a whole cache write, with no cached prefix', async () => {
    // The same ~71K-token prompt, its bulk in the opening message an earlier Turn sent.
    // An old build sends only its newest Turn, so nothing is taken as cached: about 28
    // credits, where a cached opening would need 7.
    await seedRun({ credits: CACHED_HOLD_FLOOR, opening: LARGE_SNAPSHOT })
    const response = await post({
      model: 'claude-sonnet-5-5',
      enableThinking: false,
      previousContent: [
        { type: 'text', text: 'Opening the report thread.' },
        { type: 'tool_use', id: 'toolu_2', name: 'click_element_by_uid', input: { uid: '1_7' } },
      ],
      toolResults: [{ type: 'tool_result', tool_use_id: 'toolu_2', content: 'Clicked' }],
    })

    expect(response.status).toBe(402)
    expect(streamMock).not.toHaveBeenCalled()
  })

  it('settles a cache miss above the Hold through the overage path', async () => {
    await seedRun({ credits: CACHED_HOLD_FLOOR })
    // The cache expired: the whole prompt is written again instead of read.
    streamMock.mockReturnValue(
      finishedTurn({ input_tokens: 50, cache_creation_input_tokens: 71_600, cache_read_input_tokens: 0, output_tokens: 300 })
    )

    const response = await post(continuationWithLargeCachedPrefix())
    await response.text()

    expect(response.status).toBe(200)
    // (50 x $2 + 71600 x $2.50 + 300 x $10) / 1M = $0.1821 -> x1.25 = 22.76c -> 23 credits,
    // 16 above the 7-credit Hold, so the balance goes negative
    expect(await balance()).toBe(-16)
    const [record] = await db.select().from(schema.usageRecords).where(eq(schema.usageRecords.userId, USER_ID))
    expect(record?.costCents).toBe(23)
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ reserveCents: CACHED_HOLD_FLOOR, costCents: 23 }),
      expect.stringContaining('Turn cost exceeded its Hold')
    )
  })
})
