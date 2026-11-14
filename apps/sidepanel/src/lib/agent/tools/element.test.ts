import { describe, it, expect, vi, beforeEach } from 'vitest'

const locator = vi.hoisted(() => ({ click: vi.fn(), fill: vi.fn(), hover: vi.fn() }))
vi.mock('../smart-locator', () => ({ smartLocator: locator }))

const { clickElementByUid, fillElementByUid, hoverElementByUid } = await import('./element')

function stubTabs(tabs: Array<{ id?: number }>) {
  vi.stubGlobal('chrome', { tabs: { query: vi.fn(async () => tabs) } })
}

const tools = [
  {
    name: 'click',
    run: () => clickElementByUid({ uid: 'e1' }),
    method: locator.click,
    fallback: 'Failed to click element',
    data: 'Clicked element with uid="e1"',
  },
  {
    name: 'fill',
    run: () => fillElementByUid({ uid: 'e1', value: 'hello' }),
    method: locator.fill,
    fallback: 'Failed to fill element',
    data: 'Filled element with uid="e1" with value "hello"',
  },
  {
    name: 'hover',
    run: () => hoverElementByUid({ uid: 'e1' }),
    method: locator.hover,
    fallback: 'Failed to hover over element',
    data: 'Hovered over element with uid="e1"',
  },
]

describe.each(tools)('$name element tool', ({ run, method, fallback, data }) => {
  beforeEach(() => {
    vi.resetAllMocks()
    stubTabs([{ id: 7 }])
  })

  it('fails with "No active tab found" and a duration when there is no tab', async () => {
    stubTabs([])

    const result = await run()

    expect(result).toEqual({ success: false, error: 'No active tab found', durationMs: expect.any(Number) })
    expect(method).not.toHaveBeenCalled()
  })

  it('fails the same way when the tab has no id', async () => {
    stubTabs([{}])

    expect(await run()).toMatchObject({ success: false, error: 'No active tab found' })
  })

  it('returns the exact success text with a duration', async () => {
    method.mockResolvedValue(undefined)

    const result = await run()

    expect(result).toEqual({ success: true, data, durationMs: expect.any(Number) })
    expect(method.mock.calls[0][0]).toBe(7)
    expect(method.mock.calls[0][1]).toBe('e1')
  })

  it("returns an Error's message as the error", async () => {
    method.mockRejectedValue(new Error('uid not found'))

    expect(await run()).toEqual({ success: false, error: 'uid not found', durationMs: expect.any(Number) })
  })

  it('gives the tool fallback text when a non-Error is thrown', async () => {
    method.mockRejectedValue('boom')

    expect(await run()).toEqual({ success: false, error: fallback, durationMs: expect.any(Number) })
  })

  it('reports a failing tab query through the same failure path', async () => {
    vi.stubGlobal('chrome', { tabs: { query: vi.fn(async () => Promise.reject(new Error('no windows'))) } })

    expect(await run()).toMatchObject({ success: false, error: 'no windows' })
  })
})

describe('element tool specifics', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    stubTabs([{ id: 7 }])
  })

  it('click passes doubleClick=false by default and true when asked, and says so', async () => {
    const single = await clickElementByUid({ uid: 'e1' })
    const double = await clickElementByUid({ uid: 'e2', doubleClick: true })

    expect(locator.click).toHaveBeenNthCalledWith(1, 7, 'e1', false)
    expect(locator.click).toHaveBeenNthCalledWith(2, 7, 'e2', true)
    expect(single.data).toBe('Clicked element with uid="e1"')
    expect(double.data).toBe('Clicked element with uid="e2" (double-click)')
  })

  it('fill passes the value through to the locator', async () => {
    await fillElementByUid({ uid: 'e3', value: 'a "quoted" value' })

    expect(locator.fill).toHaveBeenCalledWith(7, 'e3', 'a "quoted" value')
  })
})
