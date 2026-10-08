import { describe, it, expect } from 'vitest'
import { describeBalance } from './balance'

describe('describeBalance', () => {
  it('shows the total and the share of it that never expires', () => {
    expect(describeBalance({ creditsRemaining: 1300, purchasedCredits: 1000 })).toEqual({
      total: '$13.00',
      neverExpiresNote: 'Includes $10.00 that never expires',
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
      total: '$8.00',
      neverExpiresNote: 'Includes $8.00 that never expires',
    })
  })

  it('hides the note when the total is not positive', () => {
    expect(describeBalance({ creditsRemaining: -20, purchasedCredits: 0 })).toEqual({
      total: '-$0.20',
      neverExpiresNote: null,
    })
  })
})
