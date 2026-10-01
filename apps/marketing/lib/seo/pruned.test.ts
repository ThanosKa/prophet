import { describe, expect, it } from 'vitest'
import sitemap from '@/app/sitemap'
import { getAllBlogPosts } from '@/lib/blog'
import { permanentRedirects } from './redirects.mjs'
import { alternatives, comparisons } from './comparisons'
import { guides } from './guides'
import { industries } from './industries'
import { integrations } from './integrations'
import { isPrunedPath, noindexPaths, pruned, redirectedPaths } from './pruned.mjs'
import { professions } from './professions'
import { useCases } from './use-cases'

const PROTECTED_EXACT = new Set([
  '/',
  '/pricing',
  '/how-it-works',
  '/faq',
  '/about',
  '/privacy',
  '/terms',
  '/blog',
  '/compare',
  '/free-claude-ai',
  '/best-ai-chrome-extensions',
  '/best-ai-sidebar-extensions',
  '/best-claude-chrome-extensions',
  '/blog/accessibility-tree-vs-screenshots-browser-ai',
  '/blog/pay-per-use-ai-vs-subscription',
  '/blog/is-claude-ai-free',
  '/blog/claude-api-pricing-explained',
  '/blog/ai-extensions-that-sell-your-data',
  '/blog/use-claude-without-subscription',
])
const PROTECTED_PREFIXES = ['/compare/prophet-vs-', '/tools', '/blog/playwright-mcp']

const existingPaths = new Set([
  ...comparisons.map((c) => `/compare/${c.slug}`),
  ...alternatives.map((a) => `/alternatives/${a.slug}`),
  ...guides.map((g) => `/guides/${g.slug}`),
  ...industries.map((i) => `/industries/${i.slug}`),
  ...integrations.map((i) => `/integrations/${i.slug}`),
  ...professions.map((p) => `/for/${p.slug}`),
  ...useCases.map((u) => `/use-cases/${u.slug}`),
  ...getAllBlogPosts().map((p) => `/blog/${p.slug}`),
  '/industries',
  '/for/sales-professionals',
])

describe('pruned list', () => {
  it('has unique paths', () => {
    expect(new Set(pruned.map((e) => e.path)).size).toBe(pruned.length)
  })

  it('only prunes pages that exist', () => {
    for (const entry of pruned) expect(existingPaths.has(entry.path), entry.path).toBe(true)
  })

  it('respects the keep thresholds recorded in each entry', () => {
    for (const entry of pruned) {
      expect(entry.gsc.clicks, entry.path).toBe(0)
      expect(entry.gsc.impressions, entry.path).toBeLessThan(100)
    }
  })

  it('never prunes protected pages', () => {
    for (const entry of pruned) {
      expect(PROTECTED_EXACT.has(entry.path), entry.path).toBe(false)
      for (const prefix of PROTECTED_PREFIXES) {
        expect(entry.path.startsWith(prefix), entry.path).toBe(false)
      }
    }
  })

  it('redirects to live pages, never to another redirect (no chains)', () => {
    for (const entry of pruned) {
      if (entry.action !== 'redirect') continue
      expect(redirectedPaths.has(entry.target), `${entry.path} -> ${entry.target}`).toBe(false)
      expect(existingPaths.has(entry.target), entry.target).toBe(true)
    }
    for (const redirect of permanentRedirects) {
      expect(redirectedPaths.has(redirect.destination), redirect.source).toBe(false)
    }
  })
})

describe('sitemap and listings', () => {
  it('leaves pruned paths out of the sitemap', () => {
    const urls = sitemap().map((entry) => entry.url.replace('https://prophetchrome.com', '') || '/')
    for (const url of urls) expect(isPrunedPath(url), url).toBe(false)
    expect(urls.length).toBeGreaterThan(40)
  })

  it('does not list redirected professions', () => {
    expect(professions.map((p) => p.slug)).not.toContain('sales-professionals')
  })

  it('exposes noindex paths for next.config headers', () => {
    expect(noindexPaths.has('/guides/summarize-articles')).toBe(true)
    expect(noindexPaths.has('/for/developers')).toBe(false)
  })
})
