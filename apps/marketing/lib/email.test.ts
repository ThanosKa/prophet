import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: mocks.send }
  },
}))
vi.mock('@/lib/logger', () => ({ logger: mocks.logger }))

const { sendPurchaseEmail, sendWelcomeEmail } = await import('./email')

const ADDRESS = 'ada@example.com'
const purchase = {
  to: ADDRESS,
  firstName: 'Ada',
  planName: 'Pro',
  credits: 1000,
  isSubscription: true,
}

const everythingLogged = () =>
  JSON.stringify([...mocks.logger.info.mock.calls, ...mocks.logger.error.mock.calls])

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('transactional email', () => {
  it.each([
    ['welcome', () => sendWelcomeEmail({ to: ADDRESS, firstName: 'Ada' })],
    ['purchase', () => sendPurchaseEmail(purchase)],
  ])('gives up on a %s email after 5 seconds, so the webhook can still answer', async (_kind, send) => {
    vi.useFakeTimers()
    mocks.send.mockReturnValue(new Promise(() => {}))
    let finished = false

    const sending = send().then(() => {
      finished = true
    })
    await vi.advanceTimersByTimeAsync(4_999)
    expect(finished).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await sending

    expect(finished).toBe(true)
    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('timed out') }),
      expect.any(String)
    )
  })

  it('logs a sent email by its id, without the address', async () => {
    mocks.send.mockResolvedValue({ data: { id: 'email_1' }, error: null })

    await sendWelcomeEmail({ to: ADDRESS })
    await sendPurchaseEmail(purchase)

    expect(mocks.logger.info).toHaveBeenCalledWith(expect.objectContaining({ emailId: 'email_1' }), 'Welcome email sent')
    expect(everythingLogged()).not.toContain(ADDRESS)
  })

  it('logs a failed email without the address', async () => {
    mocks.send.mockResolvedValueOnce({ data: null, error: { name: 'validation_error', message: 'bad' } })
    mocks.send.mockRejectedValueOnce(new Error('network down'))

    await sendWelcomeEmail({ to: ADDRESS })
    await sendPurchaseEmail(purchase)

    expect(mocks.logger.error).toHaveBeenCalledTimes(2)
    expect(everythingLogged()).not.toContain(ADDRESS)
  })
})
