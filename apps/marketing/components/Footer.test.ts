import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Footer } from './Footer'

function statusLink(): string | undefined {
  vi.stubGlobal('React', React)
  const html = renderToString(React.createElement(Footer))
  return html.match(/<a [^>]*>Status<\/a>/)?.[0]
}

describe('Footer', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('links to the status page in a new tab', () => {
    const link = statusLink()

    expect(link).toContain('href="https://thanoska.betteruptime.com"')
    expect(link).toContain('target="_blank"')
    expect(link).toContain('rel="noopener noreferrer"')
  })
})
