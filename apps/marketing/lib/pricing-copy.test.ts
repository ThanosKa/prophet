import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import { softwareApplicationNode } from './structured-data'
import { homeFaqs } from './faqs'
import { blogPosts } from './blog'
import { alternatives, comparisons } from './seo/comparisons'
import { guides } from './seo/guides'
import { industries } from './seo/industries'
import { integrations } from './seo/integrations'
import { professions } from './seo/professions'
import { useCases } from './seo/use-cases'

const MARKETING_ROOT = path.resolve(__dirname, '..')

function sourceFilesUnder(dir: string): string[] {
  return readdirSync(path.join(MARKETING_ROOT, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => path.join(dir, file))
}

const publishedText: ReadonlyArray<readonly [string, string]> = [
  ...blogPosts.map((post) => [`blog/${post.slug}`, JSON.stringify(post)] as const),
  ...Object.entries({ alternatives, comparisons, guides, industries, integrations, professions, useCases }).map(
    ([set, entries]) => [`seo/${set}`, JSON.stringify(entries)] as const
  ),
  ...['public/llms.txt', 'public/llms-full.txt', 'public/pricing.md', 'lib/email.ts', ...sourceFilesUnder('app'), ...sourceFilesUnder('components')].map(
    (file) => [file, readFileSync(path.join(MARKETING_ROOT, file), 'utf8')] as const
  ),
]

/** Pricing claims that stopped being true when the Margin went to 25% and the Bonus went away. */
const STALE_PRICING_CLAIMS: ReadonlyArray<readonly [string, RegExp]> = [
  ['a Margin percentage', /\d+% (platform |service )?(margin|markup|fee)|Prophet \(\d+%\)/i],
  ['a Bonus', /\+\d+%|\d+% bonus|bonus (credits?|value)|credit bonus/i],
  ['the old $0.20 Free grant', /\$0\.20(?! per)/],
  ['an old plan credit figure', /\$(11|35|70)\b(?! per M)/],
  ['an old free message count', /(?<!\/)\b(20 Haiku|10 Sonnet|4 Opus|four Opus)\b(?! messages?(\/| per )day)/i],
]

describe('published pricing claims', () => {
  it.each(STALE_PRICING_CLAIMS)('no page states %s', (_claim, pattern) => {
    const offenders = publishedText
      .map(([source, text]) => [source, text.match(pattern)?.[0]] as const)
      .filter(([, match]) => match !== undefined)

    expect(offenders).toEqual([])
  })
})

/**
 * What visitors and AI assistants read about pricing must match the product: plans give
 * Credits equal to their price (no Bonus), the Free grant is $0.07, and no Margin
 * percentage is published.
 */
describe('SoftwareApplication offers', () => {
  it.each([
    ['Free', '0', '$0.07'],
    ['Pro', '9.99', '$10'],
    ['Premium', '29.99', '$30'],
    ['Ultra', '59.99', '$60'],
  ])('%s offer costs $%s and includes %s in credits, with no Bonus', (name, price, credits) => {
    const offer = softwareApplicationNode.offers.find((o) => o.name === name)

    expect(offer?.price).toBe(price)
    expect(offer?.description).toContain(`${credits} in`)
    expect(offer?.description).not.toMatch(/bonus|%/i)
  })
})

describe('home FAQ', () => {
  const answerTo = (question: RegExp) => homeFaqs.find((f) => question.test(f.question))?.answer

  it('says when each kind of Credits expires', () => {
    const answer = answerTo(/expire/i)

    expect(answer).toMatch(/free .*one-time/i)
    expect(answer).toMatch(/subscription credits renew monthly and do not roll over/i)
    expect(answer).toMatch(/purchased credits never expire/i)
  })

  it('states the Minimum charge', () => {
    expect(answerTo(/minimum/i)).toMatch(/at least 1 credit/i)
  })

  it('offers the $0.07 Free grant for trying Haiku, with no Sonnet or Opus message counts', () => {
    const answer = answerTo(/free version/i)

    expect(answer).toContain('$0.07')
    expect(answer).toMatch(/haiku/i)
    expect(answer).not.toMatch(/sonnet|opus/i)
  })

  it('advertises no Bonus and no $0.20 Free grant', () => {
    for (const { answer } of homeFaqs) {
      expect(answer).not.toMatch(/bonus|\$0\.20/i)
    }
  })
})
