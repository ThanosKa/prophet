import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

vi.mock('@/lib/db/user', () => ({ ensureDbUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { ensureDbUser } = await import('@/lib/db/user')

describe('POST /api/auth/sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('answers a database failure with a generic 500 instead of the raw error message', async () => {
    vi.mocked(ensureDbUser).mockRejectedValue(
      Object.assign(new Error('password authentication failed for user "postgres.abcdefgh"'), {
        address: '10.0.0.12',
        port: 6543,
      })
    )

    const response = await POST()
    const body = await response.text()

    expect(response.status).toBe(500)
    expect(JSON.parse(body)).toEqual({
      error: 'Something went wrong on our side. Please try again in a moment.',
      code: 'INTERNAL_ERROR',
    })
    expect(body).not.toContain('postgres')
    expect(body).not.toContain('10.0.0.12')
  })

  it('answers a missing session with 401 and a sign-in-again message', async () => {
    vi.mocked(ensureDbUser).mockRejectedValue(new Error('Unauthorized'))

    const response = await POST()

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: 'Your session has expired. Please sign out and sign in again.',
      code: 'UNAUTHORIZED',
    })
  })
})
