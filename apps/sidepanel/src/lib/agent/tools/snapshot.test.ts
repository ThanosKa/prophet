import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AXNode } from '../cdp-commander'

const cdp = vi.hoisted(() => ({ enable: vi.fn(), sendCommand: vi.fn() }))
vi.mock('../cdp-commander', () => ({ cdpCommander: cdp }))

const { takeSnapshot, searchSnapshot } = await import('./snapshot')

function servePage(nodes: AXNode[]) {
  cdp.sendCommand.mockImplementation(async (_tabId: number, method: string) => {
    if (method === 'Accessibility.getFullAXTree') return { nodes }
    if (method === 'DOM.resolveNode') return { object: { objectId: 'obj' } }
    return { result: { value: null } }
  })
}

function button({ id, name, value }: { id: number; name: string; value?: string }): AXNode {
  return {
    nodeId: String(id),
    ignored: false,
    role: { type: 'role', value: 'button' },
    name: { type: 'computedString', value: name },
    ...(value === undefined ? {} : { value: { type: 'string', value } }),
    backendDOMNodeId: id,
  }
}

function resultText(result: { success: boolean; data?: unknown }): string {
  if (!result.success || typeof result.data !== 'string') throw new Error('expected text data')
  return result.data
}

describe('snapshot tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('chrome', {
      tabs: {
        query: vi.fn(async () => [{ id: 1 }]),
        get: vi.fn(async () => ({ url: 'https://shop.example', title: 'Shop' })),
      },
    })
  })

  it('returns a small page snapshot in full, with no hint', async () => {
    servePage([button({ id: 1, name: 'Buy now' })])

    const text = resultText(await takeSnapshot())

    expect(text).toContain('button "Buy now"')
    expect(text).not.toContain('search_snapshot')
  })

  it('shortens an over-size snapshot to 20,000 chars and hints at search_snapshot', async () => {
    // 400 buttons of ~150 chars each: about 60,000 chars of snapshot text
    servePage(
      Array.from({ length: 400 }, (_, i) => button({ id: i + 1, name: `Product ${i} ${'x'.repeat(120)}` }))
    )

    const text = resultText(await takeSnapshot())

    expect(text.length).toBeLessThanOrEqual(20_000)
    expect(text.length).toBeGreaterThan(19_000)
    expect(text).toContain('button "Product 0 ')
    expect(text).not.toContain('Product 399 ')
    expect(text).toMatch(/search_snapshot/)
    // The cut falls between node lines, never inside one
    const lines = text.split('\n')
    const lastNodeLine = lines.filter((line) => line.includes('uid=')).at(-1)
    expect(lastNodeLine).toMatch(/"Product \d+ x{120}" <|"Product \d+ x{120}"$/)
  })

  it('caps each node name and value at 200 chars in a snapshot', async () => {
    servePage([button({ id: 1, name: 'n'.repeat(1_000), value: 'v'.repeat(1_000) })])

    const text = resultText(await takeSnapshot())

    expect(text).toContain(`"${'n'.repeat(200)}…"`)
    expect(text).not.toContain('n'.repeat(201))
    expect(text).toContain(`value="${'v'.repeat(200)}…"`)
    expect(text).not.toContain('v'.repeat(201))
  })

  it('caps each node name and value at 200 chars in search_snapshot rows', async () => {
    servePage([button({ id: 1, name: `Checkout ${'n'.repeat(1_000)}`, value: 'v'.repeat(1_000) })])
    await takeSnapshot()

    const text = resultText(await searchSnapshot({ query: 'checkout' }))

    expect(text).toContain('Found 1 elements')
    expect(text).toContain(`"Checkout ${'n'.repeat(191)}…"`)
    expect(text).not.toContain('n'.repeat(192))
    expect(text).toContain(`value="${'v'.repeat(200)}…"`)
    expect(text).not.toContain('v'.repeat(201))
  })
})
