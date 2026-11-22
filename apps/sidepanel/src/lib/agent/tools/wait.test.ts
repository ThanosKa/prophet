import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const cdp = vi.hoisted(() => ({ enable: vi.fn(), sendCommand: vi.fn() }))
vi.mock('../cdp-commander', () => ({ cdpCommander: cdp }))

const { waitForSelector, waitForNavigation, waitForTimeout } = await import('./wait')

type UpdateListener = (tabId: number, changeInfo: { status?: string }) => void

function stubChrome({ tabs = [{ id: 7 }] as Array<{ id?: number }>, status = 'loading' } = {}) {
  const listeners = new Set<UpdateListener>()
  const onUpdated = {
    addListener: vi.fn((l: UpdateListener) => listeners.add(l)),
    removeListener: vi.fn((l: UpdateListener) => listeners.delete(l)),
  }
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn(async () => tabs),
      get: vi.fn(async () => ({ status })),
      onUpdated,
    },
  })
  return { listeners, onUpdated }
}

describe('waitForSelector', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    stubChrome()
    cdp.sendCommand.mockResolvedValue({ result: { value: { found: true } } })
  })

  it('fails with "No active tab found" and a duration when there is no tab', async () => {
    stubChrome({ tabs: [] })

    expect(await waitForSelector({ selector: '#a' })).toEqual({
      success: false,
      error: 'No active tab found',
      durationMs: expect.any(Number),
    })
    expect(cdp.sendCommand).not.toHaveBeenCalled()
  })

  it('returns the found text, and adds "and visible" when visible is set', async () => {
    expect(await waitForSelector({ selector: '#a' })).toEqual({
      success: true,
      data: "Element '#a' found",
      durationMs: expect.any(Number),
    })
    expect((await waitForSelector({ selector: '#a', visible: true })).data).toBe("Element '#a' found and visible")
  })

  it('defaults the page timeout to 10s and gives CDP 1s more', async () => {
    await waitForSelector({ selector: '#a' })

    const [tabId, method, params, cdpTimeout] = cdp.sendCommand.mock.calls[0]
    expect(tabId).toBe(7)
    expect(method).toBe('Runtime.evaluate')
    expect(params.expression).toContain('}, 10000);')
    expect(params).toMatchObject({ awaitPromise: true, returnByValue: true })
    expect(cdpTimeout).toBe(11000)
  })

  it('takes the timeout from the input, and treats 0 as the default', async () => {
    await waitForSelector({ selector: '#a', timeout: 2500 })
    await waitForSelector({ selector: '#a', timeout: 0 })

    expect(cdp.sendCommand.mock.calls[0][2].expression).toContain('}, 2500);')
    expect(cdp.sendCommand.mock.calls[0][3]).toBe(3500)
    expect(cdp.sendCommand.mock.calls[1][3]).toBe(11000)
  })

  it('caps the timeout at 30s', async () => {
    await waitForSelector({ selector: '#a', timeout: 120000 })

    expect(cdp.sendCommand.mock.calls[0][2].expression).toContain('}, 30000);')
    expect(cdp.sendCommand.mock.calls[0][3]).toBe(31000)
  })

  it('escapes backslashes and single quotes in the selector', async () => {
    await waitForSelector({ selector: `a[title='x\\y']` })

    expect(cdp.sendCommand.mock.calls[0][2].expression).toContain(`document.querySelector('a[title=\\'x\\\\y\\']')`)
  })

  it('sets the visibility check from the visible input', async () => {
    await waitForSelector({ selector: '#a' })
    await waitForSelector({ selector: '#a', visible: true })

    expect(cdp.sendCommand.mock.calls[0][2].expression).toContain('if (false) {')
    expect(cdp.sendCommand.mock.calls[1][2].expression).toContain('if (true) {')
  })

  it('returns the exception text when the page reports a timeout', async () => {
    cdp.sendCommand.mockResolvedValue({ result: { type: 'object', subtype: 'error' }, exceptionDetails: { text: 'Uncaught (in promise)' } })

    expect(await waitForSelector({ selector: '#a' })).toEqual({
      success: false,
      error: 'Uncaught (in promise)',
      durationMs: expect.any(Number),
    })
  })

  it('falls back to "Timeout waiting for selector" when the exception has no text', async () => {
    cdp.sendCommand.mockResolvedValue({ result: { type: 'object', subtype: 'error' }, exceptionDetails: { text: '' } })

    expect(await waitForSelector({ selector: '#a' })).toMatchObject({
      success: false,
      error: 'Timeout waiting for selector',
    })
  })

  it("returns an Error's message, or the fallback text for a non-Error", async () => {
    cdp.sendCommand.mockRejectedValueOnce(new Error('CDP timed out'))
    cdp.sendCommand.mockRejectedValueOnce('boom')

    expect(await waitForSelector({ selector: '#a' })).toMatchObject({ success: false, error: 'CDP timed out' })
    expect(await waitForSelector({ selector: '#a' })).toMatchObject({
      success: false,
      error: 'Failed to wait for selector',
    })
  })
})

describe('waitForNavigation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fails with "No active tab found" and a duration when there is no tab', async () => {
    stubChrome({ tabs: [] })

    expect(await waitForNavigation({})).toEqual({
      success: false,
      error: 'No active tab found',
      durationMs: expect.any(Number),
    })
  })

  it('returns "Page already loaded" when the tab is complete, and removes its listener', async () => {
    const { listeners } = stubChrome({ status: 'complete' })

    expect(await waitForNavigation({})).toEqual({
      success: true,
      data: 'Page already loaded',
      durationMs: expect.any(Number),
    })
    expect(listeners.size).toBe(0)
  })

  it('resolves on a load-complete event for the active tab and removes its listener', async () => {
    const { listeners, onUpdated } = stubChrome()

    const pending = waitForNavigation({})
    await vi.advanceTimersByTimeAsync(1000)
    expect(listeners.size).toBe(1)

    for (const l of [...listeners]) {
      l(99, { status: 'complete' }) // another tab
      l(7, { status: 'loading' }) // not complete yet
    }
    expect(listeners.size).toBe(1)
    for (const l of [...listeners]) l(7, { status: 'complete' })

    expect(await pending).toEqual({ success: true, data: 'Navigation complete', durationMs: 1000 })
    expect(onUpdated.removeListener).toHaveBeenCalledTimes(1)
    expect(listeners.size).toBe(0)
  })

  it('returns the timeout error at the 30s default, and removes its listener', async () => {
    const { listeners, onUpdated } = stubChrome()

    const pending = waitForNavigation({})
    await vi.advanceTimersByTimeAsync(29_999)
    expect(listeners.size).toBe(1)
    await vi.advanceTimersByTimeAsync(1)

    expect(await pending).toEqual({
      success: false,
      error: 'Timeout waiting for navigation',
      durationMs: 30_000,
    })
    expect(onUpdated.removeListener).toHaveBeenCalledTimes(1)
    expect(listeners.size).toBe(0)
  })

  it('takes the timeout from the input and caps it at 30s', async () => {
    stubChrome()
    const short = waitForNavigation({ timeout: 500 })
    await vi.advanceTimersByTimeAsync(500)
    expect(await short).toMatchObject({ success: false, error: 'Timeout waiting for navigation', durationMs: 500 })

    stubChrome()
    const capped = waitForNavigation({ timeout: 90_000 })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(await capped).toMatchObject({ success: false, durationMs: 30_000 })
  })

  it('returns the fallback text when a non-Error is thrown', async () => {
    stubChrome()
    vi.stubGlobal('chrome', {
      tabs: { query: vi.fn(async () => Promise.reject('boom')) },
    })

    expect(await waitForNavigation({})).toMatchObject({ success: false, error: 'Failed to wait for navigation' })
  })

  it("returns an Error's message from a failing tab read", async () => {
    const { listeners } = stubChrome()
    vi.mocked(chrome.tabs.get).mockRejectedValue(new Error('tab closed'))

    expect(await waitForNavigation({})).toMatchObject({ success: false, error: 'tab closed' })
    expect(listeners.size).toBe(0)
  })
})

describe('waitForTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits the given time and returns "Waited …ms" with a duration', async () => {
    const pending = waitForTimeout({ ms: 1500 })
    await vi.advanceTimersByTimeAsync(1499)
    let settled = false
    void pending.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    expect(await pending).toEqual({ success: true, data: 'Waited 1500ms', durationMs: 1500 })
  })

  it('clamps a negative input to 0', async () => {
    const pending = waitForTimeout({ ms: -50 })
    await vi.advanceTimersByTimeAsync(0)

    expect(await pending).toEqual({ success: true, data: 'Waited 0ms', durationMs: 0 })
  })

  it('clamps an over-long input to 30s', async () => {
    const pending = waitForTimeout({ ms: 999_999 })
    await vi.advanceTimersByTimeAsync(30_000)

    expect(await pending).toEqual({ success: true, data: 'Waited 30000ms', durationMs: 30_000 })
  })
})

// Ticket 33: the page can finish loading while the "already loaded" check is in
// progress. Wait for navigation must not miss that load and return its timeout error.
describe('waitForNavigation when the load finishes during the "already loaded" check', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** The check reads 'loading', and the given statuses arrive while it is in progress. */
  function stubCheck(statuses: string[]) {
    const listeners = new Set<UpdateListener>()
    const emit = (status: string) => [...listeners].forEach((l) => l(7, { status }))
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [{ id: 7 }]),
        get: vi.fn(async () => {
          statuses.forEach(emit)
          return { status: 'loading' }
        }),
        onUpdated: {
          addListener: vi.fn((l: UpdateListener) => listeners.add(l)),
          removeListener: vi.fn((l: UpdateListener) => listeners.delete(l)),
        },
      },
    })
    return { listeners, emit }
  }

  it('reports "Navigation complete" without waiting its timeout, and removes its listener', async () => {
    const { listeners } = stubCheck(['complete'])

    const pending = waitForNavigation({})
    let done = false
    void pending.then(() => (done = true))
    await vi.advanceTimersByTimeAsync(0)

    expect(done).toBe(true)
    expect(await pending).toMatchObject({ success: true, data: 'Navigation complete' })
    expect(listeners.size).toBe(0)
  })

  it('keeps waiting when the tab starts loading again after that load', async () => {
    const { listeners, emit } = stubCheck(['complete', 'loading'])

    const pending = waitForNavigation({})
    let done = false
    void pending.then(() => (done = true))
    await vi.advanceTimersByTimeAsync(29_999)
    expect(done).toBe(false)

    emit('complete')
    expect(await pending).toMatchObject({ success: true, data: 'Navigation complete' })
    expect(listeners.size).toBe(0)
  })
})
