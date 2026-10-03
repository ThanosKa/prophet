import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TIER_CONFIG } from '@/lib/pricing'

const mocks = vi.hoisted(() => {
  const where = vi.fn()
  const set = vi.fn((_values: Record<string, unknown>) => ({ where }))
  const values = vi.fn((_values: Record<string, unknown>) => Promise.resolve())
  return {
    verify: vi.fn(),
    set,
    update: vi.fn(() => ({ set })),
    values,
    insert: vi.fn(() => ({ values })),
    deleteWhere: vi.fn(),
    invalidateUserTierCache: vi.fn(),
    sendWelcomeEmail: vi.fn(() => Promise.resolve()),
  }
})

vi.mock('svix', () => ({
  Webhook: class {
    verify(...args: unknown[]) {
      return mocks.verify(...args)
    }
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    update: mocks.update,
    insert: mocks.insert,
    delete: vi.fn(() => ({ where: mocks.deleteWhere })),
  },
}))

vi.mock('@/lib/cache', () => ({
  invalidateUserTierCache: mocks.invalidateUserTierCache,
}))

vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: mocks.sendWelcomeEmail,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((name: string) => `mock-${name}`),
  })),
}))

function userEvent({
  type,
  publicMetadata,
}: {
  type: 'user.created' | 'user.updated'
  publicMetadata?: Record<string, unknown>
}) {
  return {
    type,
    data: {
      id: 'user_123',
      email_addresses: [{ email_address: 'ada@example.com' }],
      first_name: 'Ada',
      last_name: 'Lovelace',
      public_metadata: publicMetadata ?? {},
    },
  }
}

async function postWebhook(event: unknown) {
  mocks.verify.mockReturnValue(event)
  const { POST } = await import('./route')
  return POST(
    new Request('http://localhost/api/webhooks/clerk', {
      method: 'POST',
      body: JSON.stringify(event),
    })
  )
}

function lastCallArg(fn: { mock: { calls: Array<[Record<string, unknown>]> } }) {
  const call = fn.mock.calls.at(-1)
  if (!call) throw new Error('expected the db mock to have been called')
  return call[0]
}

describe('POST /api/webhooks/clerk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CLERK_WEBHOOK_SECRET', 'whsec_test')
  })

  describe('user.updated', () => {
    it('does not downgrade a paying user to free on a profile update without tier metadata', async () => {
      const response = await postWebhook(userEvent({ type: 'user.updated' }))

      expect(response.status).toBe(200)
      const payload = lastCallArg(mocks.set)
      expect(payload).toMatchObject({ email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' })
      expect(payload.tier).toBeUndefined()
    })

    it('ignores an invalid tier in public_metadata', async () => {
      await postWebhook(userEvent({ type: 'user.updated', publicMetadata: { tier: 'enterprise' } }))

      expect(lastCallArg(mocks.set).tier).toBeUndefined()
    })

    it('ignores a valid-looking tier in public_metadata (Stripe is the source of truth)', async () => {
      await postWebhook(userEvent({ type: 'user.updated', publicMetadata: { tier: 'ultra' } }))

      expect(lastCallArg(mocks.set).tier).toBeUndefined()
    })
  })

  describe('user.created', () => {
    it('always starts new users on the free tier, ignoring public_metadata', async () => {
      const response = await postWebhook(
        userEvent({ type: 'user.created', publicMetadata: { tier: 'enterprise' } })
      )

      expect(response.status).toBe(200)
      expect(lastCallArg(mocks.values)).toMatchObject({
        id: 'user_123',
        email: 'ada@example.com',
        tier: 'free',
        creditsRemaining: TIER_CONFIG.free.credits,
      })
    })
  })

  it('deletes the user on user.deleted', async () => {
    const response = await postWebhook({ type: 'user.deleted', data: { id: 'user_123', deleted: true } })

    expect(response.status).toBe(200)
    expect(mocks.deleteWhere).toHaveBeenCalledTimes(1)
  })

  it('acknowledges event types it does not handle without touching the db', async () => {
    const response = await postWebhook({ type: 'session.created', data: { id: 'sess_123' } })

    expect(response.status).toBe(200)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it('rejects a verified payload that does not match the expected shape', async () => {
    const response = await postWebhook({ type: 'user.updated', data: { id: 42 } })

    expect(response.status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})
