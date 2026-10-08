import { describe, it, expect } from 'vitest'
import { softwareApplicationNode } from './structured-data'
import { homeFaqs } from './faqs'

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
