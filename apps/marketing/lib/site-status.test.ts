import { afterEach, describe, expect, it, vi } from 'vitest'
import { describeSiteState, fetchSiteState, readSiteState } from '@/lib/site-status'

function statusPage({ aggregate, resources }: { aggregate: string; resources: [string, string][] }) {
  return {
    data: { attributes: { aggregate_state: aggregate } },
    included: [
      { type: 'status_page_section', attributes: { name: 'Apps' } },
      ...resources.map(([publicName, status]) => ({
        type: 'status_page_resource',
        attributes: { public_name: publicName, status },
      })),
    ],
  }
}

function stubFetch(response: Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(() => response))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('describeSiteState', () => {
  it.each([
    ['operational', 'All systems normal', 'bg-emerald-500'],
    ['degraded', 'Partial outage', 'bg-amber-500'],
    ['downtime', 'Major outage', 'bg-destructive'],
    ['maintenance', 'Under maintenance', 'bg-sky-500'],
  ] as const)('shows %s as %s', (state, label, dotClass) => {
    expect(describeSiteState(state)).toEqual({ label, dotClass })
  })

  it('shows the neutral Status label with a hidden dot when the state is unknown', () => {
    expect(describeSiteState(null)).toEqual({ label: 'Status', dotClass: 'invisible' })
  })
})

describe('readSiteState', () => {
  it("prefers this site's resource over the page aggregate", () => {
    const page = statusPage({
      aggregate: 'downtime',
      resources: [['Magic Room', 'downtime'], ['Prophet', 'operational']],
    })

    expect(readSiteState(page)).toBe('operational')
  })

  it("falls back to the page aggregate when this site's resource is missing", () => {
    const page = statusPage({ aggregate: 'degraded', resources: [['Magic Room', 'operational']] })

    expect(readSiteState(page)).toBe('degraded')
  })

  it('returns null for an unknown state or a body of the wrong shape', () => {
    expect(readSiteState(statusPage({ aggregate: 'operational', resources: [['Prophet', 'weird']] }))).toBeNull()
    expect(readSiteState({ data: null })).toBeNull()
  })
})

describe('fetchSiteState', () => {
  it('reads the live state from the status page', async () => {
    stubFetch(Promise.resolve(Response.json(statusPage({ aggregate: 'operational', resources: [['Prophet', 'maintenance']] }))))

    await expect(fetchSiteState(new AbortController().signal)).resolves.toBe('maintenance')
    expect(fetch).toHaveBeenCalledWith(
      'https://thanoska.betteruptime.com/index.json',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('returns null instead of a state when the request fails', async () => {
    stubFetch(Promise.reject(new TypeError('Failed to fetch')))
    await expect(fetchSiteState(new AbortController().signal)).resolves.toBeNull()

    stubFetch(Promise.resolve(new Response('oops', { status: 503 })))
    await expect(fetchSiteState(new AbortController().signal)).resolves.toBeNull()

    stubFetch(Promise.resolve(new Response('not json')))
    await expect(fetchSiteState(new AbortController().signal)).resolves.toBeNull()
  })
})
