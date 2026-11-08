import { describe, expect, it } from 'vitest'
import { withEdgeHeaders } from './edge-headers'

const page = () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } })

describe('withEdgeHeaders', () => {
  it.each(['https://cf-test.prophetchrome.com/', 'https://prophet-marketing.thaka.workers.dev/pricing'])(
    'keeps the test address %s out of search engines',
    (url) => {
      const response = withEdgeHeaders({ request: new Request(url), response: page() })

      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    }
  )

  it('leaves the real domain indexable', () => {
    const response = withEdgeHeaders({ request: new Request('https://prophetchrome.com/'), response: page() })

    expect(response.headers.get('X-Robots-Tag')).toBeNull()
  })

  it('gives a redirect the security headers Vercel sends on it', () => {
    const redirect = new Response(null, { status: 308, headers: { Location: '/pricing' } })

    const response = withEdgeHeaders({ request: new Request('https://prophetchrome.com/plans'), response: redirect })

    expect(response.status).toBe(308)
    expect(response.headers.get('Location')).toBe('/pricing')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
  })

  it('hands back an untouched response as the same object, so nothing is rewrapped', () => {
    const original = page()

    expect(withEdgeHeaders({ request: new Request('https://prophetchrome.com/'), response: original })).toBe(original)
  })

  it('copies a response whose headers cannot change, such as a static file', async () => {
    const asset = Response.redirect('https://prophetchrome.com/', 307) // immutable headers
    expect(() => asset.headers.set('X-Test', '1')).toThrow()

    const response = withEdgeHeaders({ request: new Request('https://cf-test.prophetchrome.com/old'), response: asset })

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('https://prophetchrome.com/')
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
  })
})
