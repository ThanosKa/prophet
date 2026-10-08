import { describe, it, expect } from 'vitest'
import { balanceOf, describeAccountBalance, withTotalBalance } from './credit-balance'

describe('balanceOf', () => {
  it('names Subscription credits and Purchased credits from the DB row, with their total', () => {
    expect(balanceOf({ creditsRemaining: 300, purchasedCredits: 1000 })).toEqual({
      subscription: 300,
      purchased: 1000,
      total: 1300,
    })
  })

  it('keeps negative Subscription credits after an overage', () => {
    expect(balanceOf({ creditsRemaining: -20, purchasedCredits: 1000 })).toEqual({
      subscription: -20,
      purchased: 1000,
      total: 980,
    })
  })
})

describe('withTotalBalance', () => {
  it('sends older extension builds the total as creditsRemaining, with Purchased credits alongside', () => {
    expect(withTotalBalance({ id: 'user_1', creditsRemaining: 300, purchasedCredits: 1000 })).toEqual({
      id: 'user_1',
      creditsRemaining: 1300,
      purchasedCredits: 1000,
    })
  })
})

describe('describeAccountBalance', () => {
  it('shows the total and the Purchased credits it includes', () => {
    expect(describeAccountBalance({ subscription: 300, purchased: 1000, total: 1300 })).toEqual({
      total: '$13',
      neverExpiresNote: 'Includes $10 that never expires',
    })
  })
})
