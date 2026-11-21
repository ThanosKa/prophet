import { describe, it, expect, vi } from 'vitest'
import { redirectToStripeSession, downloadUsageExport, startPlanChange } from './billing-requests'

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

describe('startPlanChange', () => {
  const PORTAL_URL = 'https://billing.stripe.test/p'
  const CHECKOUT_URL = 'https://checkout.stripe.test/c'

  function setup({ hasPlan, checkoutAnswer }: { hasPlan: boolean; checkoutAnswer: () => Response }) {
    const checkout = vi.fn(async () => checkoutAnswer())
    const portal = vi.fn(async () => json({ url: PORTAL_URL }))
    const redirect = vi.fn()
    const notifyError = vi.fn()
    const run = () => startPlanChange({ hasPlan, checkout, portal, redirect, notifyError })
    return { checkout, portal, redirect, notifyError, run }
  }

  it('sends a subscriber to the billing portal without starting a checkout', async () => {
    const s = setup({ hasPlan: true, checkoutAnswer: () => json({ url: CHECKOUT_URL }) })
    await s.run()
    expect(s.checkout).not.toHaveBeenCalled()
    expect(s.redirect).toHaveBeenCalledWith(PORTAL_URL)
  })

  it('sends a user without a plan to Checkout', async () => {
    const s = setup({ hasPlan: false, checkoutAnswer: () => json({ url: CHECKOUT_URL }) })
    await s.run()
    expect(s.portal).not.toHaveBeenCalled()
    expect(s.redirect).toHaveBeenCalledWith(CHECKOUT_URL)
  })

  it('opens the billing portal when a stale page gets 409 SUBSCRIPTION_EXISTS', async () => {
    const s = setup({
      hasPlan: false,
      checkoutAnswer: () => json({ error: 'You already have a plan.', code: 'SUBSCRIPTION_EXISTS' }, 409),
    })
    await s.run()
    expect(s.portal).toHaveBeenCalledOnce()
    expect(s.redirect).toHaveBeenCalledWith(PORTAL_URL)
    expect(s.notifyError).not.toHaveBeenCalled()
  })

  it('shows the error for any other failed checkout', async () => {
    const s = setup({
      hasPlan: false,
      checkoutAnswer: () => json({ error: 'Too many requests', code: 'RATE_LIMIT_EXCEEDED' }, 429),
    })
    await s.run()
    expect(s.portal).not.toHaveBeenCalled()
    expect(s.redirect).not.toHaveBeenCalled()
    expect(s.notifyError).toHaveBeenCalledOnce()
  })
})
