import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { activeTabTool, waitForTabComplete } from './tab-tool'

type UpdateListener = (tabId: number, changeInfo: { status?: string }) => void

function stubChrome() {
  const listeners = new Set<UpdateListener>()
  const onUpdated = {
    addListener: vi.fn((l: UpdateListener) => listeners.add(l)),
    removeListener: vi.fn((l: UpdateListener) => listeners.delete(l)),
  }
  vi.stubGlobal('chrome', { tabs: { onUpdated } })
  const emit = (tabId: number, status: string) => [...listeners].forEach((l) => l(tabId, { status }))
  return { listeners, emit }
}

describe('waitForTabComplete', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('resolves complete when the given tab finishes loading, and removes its listener', async () => {
    const { listeners, emit } = stubChrome()
    const result = waitForTabComplete({ tabId: 7, timeoutMs: 30000 })

    emit(7, 'complete')

    expect(await result).toBe('complete')
    expect(listeners.size).toBe(0)
  })

  it('ignores other tabs and non-complete statuses', async () => {
    const { listeners, emit } = stubChrome()
    let settled = false
    const result = waitForTabComplete({ tabId: 7, timeoutMs: 30000 }).then((r) => {
      settled = true
      return r
    })

    emit(8, 'complete')
    emit(7, 'loading')
    await Promise.resolve()

    expect(settled).toBe(false)
    expect(listeners.size).toBe(1)
    emit(7, 'complete')
    expect(await result).toBe('complete')
  })

  it('resolves timed_out after exactly the given timeout, and removes its listener', async () => {
    const { listeners } = stubChrome()
    let settled = false
    const result = waitForTabComplete({ tabId: 7, timeoutMs: 5000 }).then((r) => {
      settled = true
      return r
    })

    await vi.advanceTimersByTimeAsync(4999)
    expect(settled).toBe(false)
    await vi.advanceTimersByTimeAsync(1)

    expect(await result).toBe('timed_out')
    expect(listeners.size).toBe(0)
  })
})

function stubActiveTabs(tabs: Array<{ id?: number; url?: string }>) {
  vi.stubGlobal('chrome', { tabs: { query: vi.fn(async () => tabs) } })
}

describe('activeTabTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns exactly "No active tab found" with a duration, and never runs the tool, when there is no active tab', async () => {
    const run = vi.fn(async () => ({ data: 'ran' }))
    const tool = activeTabTool<{ uid: string }>({ failure: 'Failed to act', run })

    for (const tabs of [[], [{}], [{ id: 0 }]]) {
      stubActiveTabs(tabs)
      expect(await tool({ uid: 'e1' })).toStrictEqual({
        success: false,
        error: 'No active tab found',
        durationMs: expect.any(Number),
      })
    }
    expect(run).not.toHaveBeenCalled()
  })

  it('gives success with the data unchanged, timed from before the tab lookup, and passes the input and tab to the tool', async () => {
    vi.useFakeTimers()
    try {
      stubActiveTabs([{ id: 7, url: 'https://example.com' }])
      const data = { items: [1, 2] }
      const run = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250))
        return { data }
      })
      const tool = activeTabTool<{ uid: string }>({ failure: 'Failed to act', run })

      const pending = tool({ uid: 'e1' })
      await vi.advanceTimersByTimeAsync(250)
      const result = await pending

      expect(result).toStrictEqual({ success: true, data, durationMs: 250 })
      expect(result.data).toBe(data)
      expect(run).toHaveBeenCalledWith({ input: { uid: 'e1' }, tab: { id: 7, url: 'https://example.com' } })
    } finally {
      vi.useRealTimers()
    }
  })

  it('gives failure with the error a tool returns', async () => {
    stubActiveTabs([{ id: 7 }])
    const tool = activeTabTool<{ uid: string }>({
      failure: 'Failed to act',
      run: async () => ({ error: 'Element not visible' }),
    })

    expect(await tool({ uid: 'e1' })).toStrictEqual({
      success: false,
      error: 'Element not visible',
      durationMs: expect.any(Number),
    })
  })

  it("gives a thrown Error's message, or the tool's failure text for a non-Error throw, with a duration", async () => {
    stubActiveTabs([{ id: 7 }])
    const throwing = (thrown: unknown) =>
      activeTabTool<{ uid: string }>({
        failure: 'Failed to act',
        run: async () => Promise.reject(thrown),
      })

    expect(await throwing(new Error('uid not found'))({ uid: 'e1' })).toStrictEqual({
      success: false,
      error: 'uid not found',
      durationMs: expect.any(Number),
    })
    expect(await throwing('boom')({ uid: 'e1' })).toStrictEqual({
      success: false,
      error: 'Failed to act',
      durationMs: expect.any(Number),
    })
  })

  it('reports a failing tab lookup through the same failure path', async () => {
    vi.stubGlobal('chrome', { tabs: { query: vi.fn(async () => Promise.reject(new Error('no windows'))) } })
    const tool = activeTabTool<{ uid: string }>({ failure: 'Failed to act', run: async () => ({ data: 'ran' }) })

    expect(await tool({ uid: 'e1' })).toStrictEqual({
      success: false,
      error: 'no windows',
      durationMs: expect.any(Number),
    })
  })
})
