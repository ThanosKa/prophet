import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AXNode } from '../cdp-commander'

const cdp = vi.hoisted(() => ({ enable: vi.fn(), sendCommand: vi.fn() }))
vi.mock('../cdp-commander', () => ({ cdpCommander: cdp }))

const { takeSnapshot, searchSnapshot } = await import('./snapshot')
const { snapshotManager } = await import('../snapshot-manager')

function stubChrome(tabs: Array<{ id?: number }>) {
  vi.stubGlobal('chrome', {
    tabs: {
      query: vi.fn(async () => tabs),
      get: vi.fn(async () => ({ url: 'https://shop.example', title: 'Shop' })),
    },
  })
}

const noNodes: AXNode[] = []

describe('snapshot tools: no tab, failures and timing', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    stubChrome([{ id: 1 }])
  })

  it('take_snapshot fails with "No active tab found" and a duration when there is no tab', async () => {
    stubChrome([])
    expect(await takeSnapshot()).toEqual({
      success: false,
      error: 'No active tab found',
      durationMs: expect.any(Number),
    })
    expect(cdp.sendCommand).not.toHaveBeenCalled()
  })

  it('search_snapshot fails with "No active tab found" and a duration when the tab has no id', async () => {
    stubChrome([{}])
    expect(await searchSnapshot({ query: 'buy' })).toEqual({
      success: false,
      error: 'No active tab found',
      durationMs: expect.any(Number),
    })
  })

  it("take_snapshot returns an Error's message, or its fallback text for a non-Error", async () => {
    vi.spyOn(snapshotManager, 'takeSnapshot').mockRejectedValueOnce(new Error('CDP detached'))
    vi.spyOn(snapshotManager, 'takeSnapshot').mockRejectedValueOnce('boom')
    expect(await takeSnapshot()).toEqual({
      success: false,
      error: 'CDP detached',
      durationMs: expect.any(Number),
    })
    expect(await takeSnapshot()).toEqual({
      success: false,
      error: 'Failed to take snapshot',
      durationMs: expect.any(Number),
    })
  })

  it("search_snapshot returns an Error's message, or its fallback text for a non-Error", async () => {
    vi.spyOn(snapshotManager, 'getSnapshot').mockImplementationOnce(() => {
      throw new Error('cache broken')
    })
    vi.spyOn(snapshotManager, 'getSnapshot').mockImplementationOnce(() => {
      throw 'boom'
    })
    expect(await searchSnapshot({ query: 'buy' })).toEqual({
      success: false,
      error: 'cache broken',
      durationMs: expect.any(Number),
    })
    expect(await searchSnapshot({ query: 'buy' })).toEqual({
      success: false,
      error: 'Failed to search snapshot',
      durationMs: expect.any(Number),
    })
  })

  it('search_snapshot asks for take_snapshot first when the tab has none', async () => {
    stubChrome([{ id: 424242 }])
    expect(await searchSnapshot({ query: 'buy' })).toEqual({
      success: false,
      error: 'No snapshot available. Call take_snapshot first.',
      durationMs: expect.any(Number),
    })
  })

  it('reports the time the call took as durationMs on success', async () => {
    vi.useFakeTimers()
    try {
      cdp.sendCommand.mockImplementation(async (_tabId: number, method: string) => {
        await new Promise((resolve) => setTimeout(resolve, 250))
        return method === 'Accessibility.getFullAXTree' ? { nodes: noNodes } : { result: { value: null } }
      })
      const pending = takeSnapshot()
      await vi.advanceTimersByTimeAsync(250)
      expect(await pending).toMatchObject({ success: true, durationMs: 250 })
    } finally {
      vi.useRealTimers()
    }
  })
})
