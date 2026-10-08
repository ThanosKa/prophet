import { describe, it, expect } from 'vitest'
import { softwareApplicationNode } from './structured-data'

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
