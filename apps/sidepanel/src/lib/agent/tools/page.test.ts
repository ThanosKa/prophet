import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const cdp = vi.hoisted(() => ({ enable: vi.fn(), sendCommand: vi.fn() }))
vi.mock('../cdp-commander', () => ({ cdpCommander: cdp }))

const { navigate, scrollPage, getPageContent, goBack, goForward, reloadPage, getPageInfo } =
  await import('./page')

type UpdateListener = (tabId: number, changeInfo: { status?: string }) => void

const TAB_ID = 7

let listeners: Set<UpdateListener>
let chromeStub: {
  tabs: {
    query: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    goBack: ReturnType<typeof vi.fn>
    goForward: ReturnType<typeof vi.fn>
    reload: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    onUpdated: { addListener: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> }
  }
}

function emit(tabId: number, status: string) {
  for (const listener of [...listeners]) listener(tabId, { status })
}

function useActiveTab(tab: { id?: number; title?: string; url?: string } | undefined) {
  chromeStub.tabs.query.mockResolvedValue(tab ? [tab] : [])
}

function track<T>(promise: Promise<T>) {
  const state = { done: false }
  void promise.then(() => {
    state.done = true
  })
  return state
}

beforeEach(() => {
  vi.useFakeTimers()
  cdp.sendCommand.mockReset()
  cdp.sendCommand.mockResolvedValue({ result: { value: null } })
  listeners = new Set()
  chromeStub = {
    tabs: {
      query: vi.fn(async () => [{ id: TAB_ID, title: 'Shop', url: 'https://shop.example' }]),
      update: vi.fn(async () => undefined),
      goBack: vi.fn(async () => undefined),
      goForward: vi.fn(async () => undefined),
      reload: vi.fn(async () => undefined),
      get: vi.fn(async () => ({ id: TAB_ID, title: 'Prev', url: 'https://prev.example' })),
      onUpdated: {
        addListener: vi.fn((listener: UpdateListener) => listeners.add(listener)),
        removeListener: vi.fn((listener: UpdateListener) => listeners.delete(listener)),
      },
    },
  }
  vi.stubGlobal('chrome', chromeStub)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('page tools without an active tab', () => {
  const tools: Array<[string, () => Promise<{ success: boolean; error?: string; durationMs?: number }>]> = [
    ['navigate', () => navigate({ url: 'example.com' })],
    ['scrollPage', () => scrollPage({ direction: 'down' })],
    ['getPageContent', () => getPageContent()],
    ['goBack', () => goBack()],
    ['goForward', () => goForward()],
    ['reloadPage', () => reloadPage()],
    ['getPageInfo', () => getPageInfo()],
  ]

  it.each(tools)('%s fails with "No active tab found" when there is no tab', async (_name, run) => {
    useActiveTab(undefined)
    const result = await run()
    expect(result.success).toBe(false)
    expect(result.error).toBe('No active tab found')
    expect(typeof result.durationMs).toBe('number')
  })

  it.each(tools)('%s fails with "No active tab found" when the tab has no id', async (_name, run) => {
    useActiveTab({ title: 'x' })
    const result = await run()
    expect(result.success).toBe(false)
    expect(result.error).toBe('No active tab found')
    expect(typeof result.durationMs).toBe('number')
  })
})

describe('page tool failures', () => {
  const cases: Array<[string, () => Promise<{ success: boolean; error?: string; durationMs?: number }>, () => void, string]> = [
    ['navigate', () => navigate({ url: 'a.com' }), () => chromeStub.tabs.update.mockRejectedValue('boom'), 'Failed to navigate'],
    ['scrollPage', () => scrollPage({ direction: 'down' }), () => cdp.sendCommand.mockRejectedValue('boom'), 'Failed to scroll'],
    ['getPageContent', () => getPageContent(), () => cdp.sendCommand.mockRejectedValue('boom'), 'Failed to get page content'],
    ['goBack', () => goBack(), () => chromeStub.tabs.goBack.mockRejectedValue('boom'), 'Failed to go back'],
    ['goForward', () => goForward(), () => chromeStub.tabs.goForward.mockRejectedValue('boom'), 'Failed to go forward'],
    ['reloadPage', () => reloadPage(), () => chromeStub.tabs.reload.mockRejectedValue('boom'), 'Failed to reload page'],
    ['getPageInfo', () => getPageInfo(), () => cdp.sendCommand.mockRejectedValue('boom'), 'Failed to get page info'],
  ]

  it.each(cases)('%s returns an Error message as the error', async (_name, run, arrange) => {
    arrange()
    const error = new Error('tab crashed')
    chromeStub.tabs.update.mockRejectedValue(error)
    chromeStub.tabs.goBack.mockRejectedValue(error)
    chromeStub.tabs.goForward.mockRejectedValue(error)
    chromeStub.tabs.reload.mockRejectedValue(error)
    cdp.sendCommand.mockRejectedValue(error)

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toBe('tab crashed')
    expect(typeof result.durationMs).toBe('number')
  })

  it.each(cases)('%s uses its own fallback text for a non-Error throw', async (_name, run, arrange, fallback) => {
    arrange()

    const result = await run()

    expect(result.success).toBe(false)
    expect(result.error).toBe(fallback)
    expect(typeof result.durationMs).toBe('number')
  })
})

describe('navigate', () => {
  it('goes to the URL and waits for the tab to finish loading', async () => {
    const promise = navigate({ url: 'https://example.com/a' })
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(0)

    expect(chromeStub.tabs.update).toHaveBeenCalledWith(TAB_ID, { url: 'https://example.com/a' })
    expect(state.done).toBe(false)

    emit(TAB_ID, 'complete')
    const result = await promise

    expect(result).toEqual({
      success: true,
      data: 'Navigated to https://example.com/a',
      durationMs: expect.any(Number),
    })
  })

  it('keeps an http:// URL as it is', async () => {
    const promise = navigate({ url: 'http://example.com' })
    await vi.advanceTimersByTimeAsync(0)
    emit(TAB_ID, 'complete')
    const result = await promise

    expect(chromeStub.tabs.update).toHaveBeenCalledWith(TAB_ID, { url: 'http://example.com' })
    expect(result.data).toBe('Navigated to http://example.com')
  })

  it('adds https:// to a URL with no scheme', async () => {
    const promise = navigate({ url: 'example.com/path' })
    await vi.advanceTimersByTimeAsync(0)
    emit(TAB_ID, 'complete')
    const result = await promise

    expect(chromeStub.tabs.update).toHaveBeenCalledWith(TAB_ID, { url: 'https://example.com/path' })
    expect(result.data).toBe('Navigated to https://example.com/path')
  })
})

describe('scrollPage', () => {
  async function scroll(input: Parameters<typeof scrollPage>[0]) {
    const promise = scrollPage(input)
    await vi.advanceTimersByTimeAsync(100)
    return promise
  }

  it.each([
    ['up', 'window.scrollBy(0, -500)', 'Scrolled up by 500px'],
    ['down', 'window.scrollBy(0, 500)', 'Scrolled down by 500px'],
    ['left', 'window.scrollBy(-500, 0)', 'Scrolled left by 500px'],
    ['right', 'window.scrollBy(500, 0)', 'Scrolled right by 500px'],
    ['top', 'window.scrollTo(0, 0)', 'Scrolled top'],
    ['bottom', 'window.scrollTo(0, document.body.scrollHeight)', 'Scrolled bottom'],
  ] as const)('%s runs the right expression and reports it', async (direction, expression, data) => {
    const result = await scroll({ direction })

    expect(cdp.sendCommand).toHaveBeenCalledWith(TAB_ID, 'Runtime.evaluate', {
      expression,
      awaitPromise: false,
    })
    expect(result).toEqual({ success: true, data, durationMs: expect.any(Number) })
  })

  it('uses the given pixels, and negating negative pixels flips the direction', async () => {
    const down = await scroll({ direction: 'down', pixels: 120 })
    const upNegative = await scroll({ direction: 'up', pixels: -300 })

    expect(cdp.sendCommand.mock.calls[0][2].expression).toBe('window.scrollBy(0, 120)')
    expect(down.data).toBe('Scrolled down by 120px')
    expect(cdp.sendCommand.mock.calls[1][2].expression).toBe('window.scrollBy(0, 300)')
    expect(upNegative.data).toBe('Scrolled up by -300px')
  })

  it('fails on an unknown direction without sending a command', async () => {
    const result = await scroll({ direction: 'sideways' as never })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid scroll direction: sideways')
    expect(typeof result.durationMs).toBe('number')
    expect(cdp.sendCommand).not.toHaveBeenCalled()
  })

  it('waits 100ms after scrolling', async () => {
    const promise = scrollPage({ direction: 'down' })
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(99)
    expect(state.done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(state.done).toBe(true)
  })
})

describe('getPageContent', () => {
  it('returns title, URL and text of the page', async () => {
    cdp.sendCommand.mockResolvedValue({ result: { value: 'Hello world' } })

    const result = await getPageContent()

    expect(cdp.sendCommand).toHaveBeenCalledWith(
      TAB_ID,
      'Runtime.evaluate',
      expect.objectContaining({ returnByValue: true })
    )
    expect(result).toEqual({
      success: true,
      data: 'Page: Shop\nURL: https://shop.example\n\nContent:\nHello world',
      durationMs: expect.any(Number),
    })
  })

  it('falls back to empty title, URL and text', async () => {
    useActiveTab({ id: TAB_ID })
    cdp.sendCommand.mockResolvedValue({ result: {} })

    const result = await getPageContent()

    expect(result.data).toBe('Page: \nURL: \n\nContent:\n')
  })

  it('fails with the exception text when the page script throws', async () => {
    cdp.sendCommand.mockResolvedValue({ result: {}, exceptionDetails: { text: 'Uncaught' } })

    const result = await getPageContent()

    expect(result.success).toBe(false)
    expect(result.error).toBe('Uncaught')
  })

  it('fails with a fallback when the exception has no text', async () => {
    cdp.sendCommand.mockResolvedValue({ result: {}, exceptionDetails: { text: '' } })

    const result = await getPageContent()

    expect(result.error).toBe('Failed to get page content')
  })
})

describe('getPageInfo', () => {
  it('returns the tab and viewport info as JSON text', async () => {
    const viewport = { width: 1, height: 2, scrollX: 3, scrollY: 4, scrollHeight: 5, scrollWidth: 6 }
    cdp.sendCommand.mockResolvedValue({ result: { value: { readyState: 'complete', viewport } } })

    const result = await getPageInfo()

    expect(result.success).toBe(true)
    expect(result.data).toBe(
      JSON.stringify(
        { title: 'Shop', url: 'https://shop.example', tabId: TAB_ID, readyState: 'complete', viewport },
        null,
        2
      )
    )
    expect(typeof result.durationMs).toBe('number')
  })

  it('uses "Untitled" and an empty URL when the tab has neither', async () => {
    useActiveTab({ id: TAB_ID })
    const viewport = { width: 800, height: 600, scrollX: 0, scrollY: 0, scrollHeight: 600, scrollWidth: 800 }
    cdp.sendCommand.mockResolvedValue({ result: { value: { readyState: 'loading', viewport } } })

    const result = await getPageInfo()

    expect(JSON.parse(result.data as string)).toEqual({
      title: 'Untitled',
      url: '',
      tabId: TAB_ID,
      readyState: 'loading',
      viewport,
    })
  })
})

describe('history and reload tools', () => {
  it('goBack reports the previous page title', async () => {
    const promise = goBack()
    await vi.advanceTimersByTimeAsync(0)
    emit(TAB_ID, 'complete')

    expect(await promise).toEqual({
      success: true,
      data: 'Navigated back to: Prev',
      durationMs: expect.any(Number),
    })
    expect(chromeStub.tabs.goBack).toHaveBeenCalledWith(TAB_ID)
  })

  it('goBack falls back to the URL when the page has no title', async () => {
    chromeStub.tabs.get.mockResolvedValue({ id: TAB_ID, title: '', url: 'https://prev.example' })
    const promise = goBack()
    await vi.advanceTimersByTimeAsync(0)
    emit(TAB_ID, 'complete')

    expect((await promise).data).toBe('Navigated back to: https://prev.example')
  })

  it('goForward reports the next page title', async () => {
    const promise = goForward()
    await vi.advanceTimersByTimeAsync(0)
    emit(TAB_ID, 'complete')

    expect(await promise).toEqual({
      success: true,
      data: 'Navigated forward to: Prev',
      durationMs: expect.any(Number),
    })
    expect(chromeStub.tabs.goForward).toHaveBeenCalledWith(TAB_ID)
  })

  it('goForward falls back to the URL when the page has no title', async () => {
    chromeStub.tabs.get.mockResolvedValue({ id: TAB_ID, title: '', url: 'https://next.example' })
    const promise = goForward()
    await vi.advanceTimersByTimeAsync(0)
    emit(TAB_ID, 'complete')

    expect((await promise).data).toBe('Navigated forward to: https://next.example')
  })

  it('reloadPage reports "Page reloaded"', async () => {
    const promise = reloadPage()
    await vi.advanceTimersByTimeAsync(0)
    emit(TAB_ID, 'complete')

    expect(await promise).toEqual({
      success: true,
      data: 'Page reloaded',
      durationMs: expect.any(Number),
    })
    expect(chromeStub.tabs.reload).toHaveBeenCalledWith(TAB_ID)
  })
})

describe('waiting for a page to load', () => {
  const waiters: Array<[string, () => Promise<{ success: boolean }>, number]> = [
    ['navigate', () => navigate({ url: 'example.com' }), 30_000],
    ['reloadPage', () => reloadPage(), 30_000],
    ['goBack', () => goBack(), 5_000],
    ['goForward', () => goForward(), 5_000],
  ]

  it.each(waiters)('%s resolves early on a load-complete event for its own tab', async (_name, run) => {
    const promise = run()
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(0)

    emit(TAB_ID, 'complete')
    await vi.advanceTimersByTimeAsync(0)

    expect(state.done).toBe(true)
    expect((await promise).success).toBe(true)
  })

  it.each(waiters)('%s ignores events for other tabs and non-complete status', async (_name, run) => {
    const promise = run()
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(0)

    emit(TAB_ID + 1, 'complete')
    emit(TAB_ID, 'loading')
    await vi.advanceTimersByTimeAsync(0)

    expect(state.done).toBe(false)
    expect(listeners.size).toBe(1)

    emit(TAB_ID, 'complete')
    await promise
  })

  it.each(waiters)('%s removes its listener when the load completes', async (_name, run) => {
    const promise = run()
    await vi.advanceTimersByTimeAsync(0)
    expect(listeners.size).toBe(1)

    emit(TAB_ID, 'complete')
    await promise

    expect(chromeStub.tabs.onUpdated.removeListener).toHaveBeenCalledWith(
      chromeStub.tabs.onUpdated.addListener.mock.calls[0][0]
    )
    expect(listeners.size).toBe(0)
  })

  it.each(waiters)('%s waits its full timeout, then carries on and removes its listener', async (_name, run, timeout) => {
    const promise = run()
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(timeout - 1)
    expect(state.done).toBe(false)
    expect(listeners.size).toBe(1)

    await vi.advanceTimersByTimeAsync(1)
    const result = await promise

    expect(result.success).toBe(true)
    expect(listeners.size).toBe(0)
    expect(chromeStub.tabs.onUpdated.removeListener).toHaveBeenCalledTimes(1)
  })
})

describe('a load that finishes while the navigation is being requested', () => {
  const requests: Array<[string, () => Promise<{ success: boolean }>, () => ReturnType<typeof vi.fn>, number]> = [
    ['navigate', () => navigate({ url: 'example.com' }), () => chromeStub.tabs.update, 30_000],
    ['reloadPage', () => reloadPage(), () => chromeStub.tabs.reload, 30_000],
    ['goBack', () => goBack(), () => chromeStub.tabs.goBack, 5_000],
    ['goForward', () => goForward(), () => chromeStub.tabs.goForward, 5_000],
  ]

  it.each(requests)('%s finishes without waiting its timeout, and removes its listener', async (_name, run, request) => {
    request().mockImplementation(async () => {
      emit(TAB_ID, 'loading')
      emit(TAB_ID, 'complete')
    })

    const promise = run()
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(0)

    expect(state.done).toBe(true)
    expect((await promise).success).toBe(true)
    expect(listeners.size).toBe(0)
  })

  it.each(requests)(
    "%s keeps waiting for the new page when the old page's load-complete arrives before the request",
    async (_name, run, request, timeout) => {
      chromeStub.tabs.query.mockImplementation(async () => {
        emit(TAB_ID, 'complete')
        return [{ id: TAB_ID, title: 'Shop', url: 'https://shop.example' }]
      })
      request().mockImplementation(async () => {
        emit(TAB_ID, 'complete')
      })

      const promise = run()
      const state = track(promise)
      await vi.advanceTimersByTimeAsync(timeout - 1)
      expect(state.done).toBe(false)

      emit(TAB_ID, 'loading')
      emit(TAB_ID, 'complete')
      await vi.advanceTimersByTimeAsync(0)

      expect(state.done).toBe(true)
      expect((await promise).success).toBe(true)
      expect(listeners.size).toBe(0)
    }
  )

  it.each(requests)('%s ignores a load that finishes during the request in another tab', async (_name, run, request, timeout) => {
    request().mockImplementation(async () => {
      emit(TAB_ID + 1, 'loading')
      emit(TAB_ID + 1, 'complete')
    })

    const promise = run()
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(timeout - 1)
    expect(state.done).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect((await promise).success).toBe(true)
    expect(listeners.size).toBe(0)
  })

  it.each(requests)('%s keeps waiting when the tab starts loading again during the request', async (_name, run, request, timeout) => {
    request().mockImplementation(async () => {
      emit(TAB_ID, 'loading')
      emit(TAB_ID, 'complete')
      emit(TAB_ID, 'loading')
    })

    const promise = run()
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(timeout - 1)
    expect(state.done).toBe(false)

    emit(TAB_ID, 'complete')
    await promise
    expect(listeners.size).toBe(0)
  })

  it.each(requests)('%s removes its listener when the request fails', async (_name, run, request) => {
    request().mockRejectedValue(new Error('tab crashed'))

    expect(await run()).toMatchObject({ success: false, error: 'tab crashed' })
    expect(listeners.size).toBe(0)
  })
})
