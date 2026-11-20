import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../snapshot-manager', () => ({ snapshotManager: {} }))
vi.mock('../debugger-manager', () => ({ debuggerManager: {} }))

const { openNewTab } = await import('./tabs')

type UpdateListener = (tabId: number, changeInfo: { status?: string }) => void

const NEW_TAB_ID = 42

let listeners: Set<UpdateListener>
let chromeStub: {
  tabs: {
    create: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    onUpdated: { addListener: ReturnType<typeof vi.fn>; removeListener: ReturnType<typeof vi.fn> }
  }
}

function emit(tabId: number, status: string) {
  for (const listener of [...listeners]) listener(tabId, { status })
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
  listeners = new Set()
  chromeStub = {
    tabs: {
      create: vi.fn(async () => ({ id: NEW_TAB_ID })),
      get: vi.fn(async () => ({ id: NEW_TAB_ID, title: 'Example' })),
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

describe('openNewTab', () => {
  it('opens the URL in an active tab and reports its id and title', async () => {
    const promise = openNewTab({ url: 'https://example.com' })
    await vi.advanceTimersByTimeAsync(0)
    emit(NEW_TAB_ID, 'complete')

    expect(await promise).toEqual({
      success: true,
      data: `Opened new tab [id=${NEW_TAB_ID}]: Example`,
      durationMs: expect.any(Number),
    })
    expect(chromeStub.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com', active: true })
  })

  it('passes active: false through', async () => {
    const promise = openNewTab({ url: 'https://example.com', active: false })
    await vi.advanceTimersByTimeAsync(0)
    emit(NEW_TAB_ID, 'complete')
    await promise

    expect(chromeStub.tabs.create).toHaveBeenCalledWith({ url: 'https://example.com', active: false })
  })

  it('adds https:// to a URL with no scheme and keeps http://', async () => {
    const bare = openNewTab({ url: 'example.com' })
    await vi.advanceTimersByTimeAsync(0)
    emit(NEW_TAB_ID, 'complete')
    await bare
    const plain = openNewTab({ url: 'http://example.com' })
    await vi.advanceTimersByTimeAsync(0)
    emit(NEW_TAB_ID, 'complete')
    await plain

    expect(chromeStub.tabs.create).toHaveBeenNthCalledWith(1, { url: 'https://example.com', active: true })
    expect(chromeStub.tabs.create).toHaveBeenNthCalledWith(2, { url: 'http://example.com', active: true })
  })

  it('falls back to the URL when the tab has no title', async () => {
    chromeStub.tabs.get.mockResolvedValue({ id: NEW_TAB_ID, title: '' })
    const promise = openNewTab({ url: 'example.com' })
    await vi.advanceTimersByTimeAsync(0)
    emit(NEW_TAB_ID, 'complete')

    expect((await promise).data).toBe(`Opened new tab [id=${NEW_TAB_ID}]: https://example.com`)
  })

  it('fails with "Failed to create new tab" when the new tab has no id', async () => {
    chromeStub.tabs.create.mockResolvedValue({})

    const result = await openNewTab({ url: 'example.com' })

    expect(result).toEqual({
      success: false,
      error: 'Failed to create new tab',
      durationMs: expect.any(Number),
    })
    expect(listeners.size).toBe(0)
  })

  it('returns an Error message as the error', async () => {
    chromeStub.tabs.create.mockRejectedValue(new Error('window closed'))

    const result = await openNewTab({ url: 'example.com' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('window closed')
    expect(typeof result.durationMs).toBe('number')
  })

  it('uses "Failed to open new tab" for a non-Error throw', async () => {
    chromeStub.tabs.create.mockRejectedValue('boom')

    const result = await openNewTab({ url: 'example.com' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Failed to open new tab')
  })

  it('resolves early on a load-complete event for the new tab and removes its listener', async () => {
    const promise = openNewTab({ url: 'example.com' })
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(0)

    emit(NEW_TAB_ID + 1, 'complete')
    emit(NEW_TAB_ID, 'loading')
    await vi.advanceTimersByTimeAsync(0)
    expect(state.done).toBe(false)
    expect(listeners.size).toBe(1)

    emit(NEW_TAB_ID, 'complete')
    await promise

    expect(listeners.size).toBe(0)
    expect(chromeStub.tabs.onUpdated.removeListener).toHaveBeenCalledTimes(1)
  })

  it('waits 30 seconds, then carries on and removes its listener', async () => {
    const promise = openNewTab({ url: 'example.com' })
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(state.done).toBe(false)
    expect(listeners.size).toBe(1)

    await vi.advanceTimersByTimeAsync(1)
    const result = await promise

    expect(result.success).toBe(true)
    expect(listeners.size).toBe(0)
    expect(chromeStub.tabs.onUpdated.removeListener).toHaveBeenCalledTimes(1)
  })
})

// Ticket 33: the new tab can finish loading before chrome.tabs.create returns.
describe('openNewTab when the new tab finishes loading while it is being created', () => {
  it('finishes without waiting 30 seconds, and removes its listener', async () => {
    chromeStub.tabs.create.mockImplementation(async () => {
      emit(NEW_TAB_ID, 'complete')
      return { id: NEW_TAB_ID }
    })

    const promise = openNewTab({ url: 'example.com' })
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(0)

    expect(state.done).toBe(true)
    expect((await promise).success).toBe(true)
    expect(listeners.size).toBe(0)
  })

  it('ignores a load that finishes during the call in another tab', async () => {
    chromeStub.tabs.create.mockImplementation(async () => {
      emit(NEW_TAB_ID + 1, 'complete')
      return { id: NEW_TAB_ID }
    })

    const promise = openNewTab({ url: 'example.com' })
    const state = track(promise)
    await vi.advanceTimersByTimeAsync(29_999)
    expect(state.done).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect((await promise).success).toBe(true)
    expect(listeners.size).toBe(0)
  })

  it('removes its listener when creating the tab fails', async () => {
    chromeStub.tabs.create.mockRejectedValue(new Error('window closed'))

    expect(await openNewTab({ url: 'example.com' })).toMatchObject({ success: false, error: 'window closed' })
    expect(listeners.size).toBe(0)
  })
})
