import { describe, it, expect, vi } from 'vitest'
import { redirectToStripeSession, downloadUsageExport } from './billing-requests'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('redirectToStripeSession', () => {
  it('redirects to the session url on success', async () => {
    const redirect = vi.fn()
    const notifyError = vi.fn()
    await redirectToStripeSession({ request: async () => json({ url: 'https://stripe.test/s' }), redirect, notifyError })
    expect(redirect).toHaveBeenCalledWith('https://stripe.test/s')
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('shows an error and does not redirect on a 429', async () => {
    const redirect = vi.fn()
    const notifyError = vi.fn()
    await redirectToStripeSession({
      request: async () => json({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' }, 429),
      redirect,
      notifyError,
    })
    expect(redirect).not.toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledOnce()
  })

  it('shows an error when the request itself fails', async () => {
    const notifyError = vi.fn()
    await redirectToStripeSession({
      request: async () => { throw new Error('network') },
      redirect: vi.fn(),
      notifyError,
    })
    expect(notifyError).toHaveBeenCalledOnce()
  })
})

describe('downloadUsageExport', () => {
  it('saves the CSV on success', async () => {
    const save = vi.fn()
    const notifyError = vi.fn()
    await downloadUsageExport({
      request: async () => new Response('a,b', { status: 200, headers: { 'Content-Type': 'text/csv' } }),
      save,
      notifyError,
    })
    expect(save).toHaveBeenCalledOnce()
    expect(await save.mock.calls[0][0].text()).toBe('a,b')
    expect(notifyError).not.toHaveBeenCalled()
  })

  it('shows an error and saves nothing on a 429', async () => {
    const save = vi.fn()
    const notifyError = vi.fn()
    await downloadUsageExport({
      request: async () => json({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' }, 429),
      save,
      notifyError,
    })
    expect(save).not.toHaveBeenCalled()
    expect(notifyError).toHaveBeenCalledOnce()
  })

  it('shows an error when the request itself fails', async () => {
    const notifyError = vi.fn()
    await downloadUsageExport({
      request: async () => { throw new Error('network') },
      save: vi.fn(),
      notifyError,
    })
    expect(notifyError).toHaveBeenCalledOnce()
  })
})
