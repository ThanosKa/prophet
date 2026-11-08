import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CloudflareWebAnalytics } from './cloudflare-web-analytics'

function render(): string {
  vi.stubGlobal('React', React) // This Vitest config compiles JSX to React.createElement.
  return renderToString(React.createElement(CloudflareWebAnalytics))
}

describe('CloudflareWebAnalytics', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('puts the deferred beacon with the site token in the production Worker HTML', () => {
    vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' })
    vi.stubEnv('NODE_ENV', 'production')

    const html = render()

    expect(html).toContain('src="https://static.cloudflareinsights.com/beacon.min.js"')
    expect(html).toMatch(/<script[^>]*\bdefer\b/)
    expect(html).toContain('78e27d1fb0b6460fbece52cca9cfb15a')
  })

  it('leaves the beacon out on Vercel, where it would count visits Cloudflare does not serve', () => {
    vi.stubGlobal('navigator', { userAgent: 'Node.js/24' })
    vi.stubEnv('NODE_ENV', 'production')

    expect(render()).toBe('')
  })

  it('leaves the beacon out of a development Worker', () => {
    vi.stubGlobal('navigator', { userAgent: 'Cloudflare-Workers' })
    vi.stubEnv('NODE_ENV', 'development')

    expect(render()).toBe('')
  })
})
