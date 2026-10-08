import { describe, it, expect } from 'vitest'
import { describeBalance, formatDollars } from './balance'

describe('formatDollars', () => {
  it.each([
    [7, '$0.07'],
    [1000, '$10'],
    [6000, '$60'],
    [1050, '$10.50'],
    [0, '$0'],
    [-4, '-$0.04'],
    [-1000, '-$10'],
  ])('shows %i Credits as %s', (credits, dollars) => {
    expect(formatDollars(credits)).toBe(dollars)
  })
})

describe('describeBalance', () => {
  it('shows the total and the share of it that never expires', () => {
    expect(describeBalance({ creditsRemaining: 1300, purchasedCredits: 1000 })).toEqual({
      total: '$13',
      neverExpiresNote: 'Includes $10 that never expires',
    })
  })

  it('hides the note when the user has no Purchased credits', () => {
    expect(describeBalance({ creditsRemaining: 7, purchasedCredits: 0 })).toEqual({
      total: '$0.07',
      neverExpiresNote: null,
    })
  })

  it('hides the note when an older server sends no Purchased credits', () => {
    expect(describeBalance({ creditsRemaining: 500 }).neverExpiresNote).toBeNull()
  })

  it('never claims more than the total never expires when Subscription credits are negative', () => {
    expect(describeBalance({ creditsRemaining: 800, purchasedCredits: 1000 })).toEqual({
      total: '$8',
      neverExpiresNote: 'Includes $8 that never expires',
    })
  })

  it('hides the note when the total is not positive', () => {
    expect(describeBalance({ creditsRemaining: -20, purchasedCredits: 0 })).toEqual({
      total: '-$0.20',
      neverExpiresNote: null,
    })
  })
})
