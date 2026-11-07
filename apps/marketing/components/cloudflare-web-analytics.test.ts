import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { CloudflareWebAnalytics } from './cloudflare-web-analytics'

describe('CloudflareWebAnalytics', () => {
  it('puts the deferred beacon with the site token in the server HTML', () => {
    vi.stubGlobal('React', React) // This Vitest config compiles JSX to React.createElement.

    const html = renderToString(React.createElement(CloudflareWebAnalytics))

    expect(html).toContain('src="https://static.cloudflareinsights.com/beacon.min.js"')
    expect(html).toMatch(/<script[^>]*\bdefer\b/)
    expect(html).toContain('78e27d1fb0b6460fbece52cca9cfb15a')
  })
})
