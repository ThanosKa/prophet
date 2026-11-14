import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { waitForTabComplete } from './tab-tool'

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
