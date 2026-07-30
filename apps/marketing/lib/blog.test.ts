import { describe, it, expect } from 'vitest'
import { blogPosts } from './blog'
import { blogPostingJsonLd } from './structured-data'
import { alternatives, comparisons } from './seo/comparisons'
import { guides } from './seo/guides'
import { industries } from './seo/industries'
import { integrations } from './seo/integrations'
import { professions } from './seo/professions'
import { useCases } from './seo/use-cases'

/**
 * Blog titles render with `title: { absolute }`, so no "| Prophet" suffix is
 * appended. Google truncates SERP titles at roughly 600px (~60 chars) and
 * descriptions at roughly 920px (~155 chars); anything longer is spent on
 * an ellipsis instead of a reason to click.
 */
const TITLE_MAX = 60
const DESCRIPTION_MAX = 155

describe('blog post snippet budgets', () => {
  it.each(blogPosts.map((p) => [p.slug, p.title] as const))(
    '%s title fits the SERP',
    (_slug, title) => {
      expect(title.length).toBeLessThanOrEqual(TITLE_MAX)
      expect(title.trim()).toBe(title)
    }
  )

  it.each(blogPosts.map((p) => [p.slug, p.description] as const))(
    '%s description fits the SERP',
    (_slug, description) => {
      expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
      expect(description.trim()).toBe(description)
    }
  )

  it('has no duplicate titles or descriptions', () => {
    expect(new Set(blogPosts.map((p) => p.title)).size).toBe(blogPosts.length)
    expect(new Set(blogPosts.map((p) => p.description)).size).toBe(blogPosts.length)
  })

  it('has no duplicate slugs', () => {
    expect(new Set(blogPosts.map((p) => p.slug)).size).toBe(blogPosts.length)
  })
})

/**
 * Programmatic pages set `title` without `absolute`, so the root layout appends
 * "| Prophet". Their effective SERP title is therefore the data title plus that
 * suffix, which is the budget checked here — blog posts use `absolute` and are
 * checked above without it.
 */
const TITLE_SUFFIX = ' | Prophet'

/**
 * Two titles predate this budget and sit 1-3 characters over. They are listed
 * rather than excluded by a looser limit so that any *new* overrun still fails.
 */
const TITLE_OVERRUN_DEBT = new Set([
  'prophet-vs-claude-in-chrome',
  'claude-in-chrome-alternative',
])

const programmaticPages = [
  ['comparisons', comparisons],
  ['alternatives', alternatives],
  ['guides', guides],
  ['industries', industries],
  ['integrations', integrations],
  ['professions', professions],
  ['useCases', useCases],
] as const satisfies ReadonlyArray<
  readonly [string, ReadonlyArray<{ slug: string; title: string; description: string }>]
>

describe('programmatic page snippet budgets', () => {
  it.each(
    programmaticPages.flatMap(([set, entries]) =>
      entries.map((e) => [`${set}/${e.slug}`, e.slug, e.title] as const)
    )
  )('%s title fits the SERP', (_id, slug, title) => {
    expect(title.trim()).toBe(title)
    if (TITLE_OVERRUN_DEBT.has(slug)) return
    expect((title + TITLE_SUFFIX).length).toBeLessThanOrEqual(TITLE_MAX)
  })

  it.each(
    programmaticPages.flatMap(([set, entries]) =>
      entries.map((e) => [`${set}/${e.slug}`, e.description] as const)
    )
  )('%s description fits the SERP', (_id, description) => {
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(description.trim()).toBe(description)
  })

  it.each(programmaticPages)('%s has no duplicate slugs, titles or descriptions', (_set, entries) => {
    expect(new Set(entries.map((e) => e.slug)).size).toBe(entries.length)
    expect(new Set(entries.map((e) => e.title)).size).toBe(entries.length)
    expect(new Set(entries.map((e) => e.description)).size).toBe(entries.length)
  })
})

describe('BlogPosting structured data', () => {
  it.each(blogPosts.map((p) => [p.slug, p] as const))(
    '%s emits every Google-required BlogPosting property',
    (_slug, post) => {
      const node = blogPostingJsonLd(post)

      expect(node['@type']).toBe('BlogPosting')
      expect(node.headline.length).toBeLessThanOrEqual(110)
      expect(node.image.length).toBeGreaterThan(0)
      expect(node.author.name).toBeTruthy()
      expect(node.publisher.logo.url).toMatch(/\.(png|jpg|jpeg)$/)
      expect(node.wordCount).toBeGreaterThan(0)

      // Google requires ISO 8601 dates and rejects a dateModified before publish.
      expect(node.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(node.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(node.dateModified).getTime()).toBeGreaterThanOrEqual(
        new Date(node.datePublished).getTime()
      )
    }
  )
})
