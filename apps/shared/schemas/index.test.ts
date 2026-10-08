import { describe, it, expect } from 'vitest'
import { userBalanceSchema } from './index'

describe('userBalanceSchema', () => {
  it('parses a balance with Purchased credits', () => {
    expect(userBalanceSchema.parse({ creditsRemaining: 13, purchasedCredits: 10 })).toEqual({
      creditsRemaining: 13,
      purchasedCredits: 10,
    })
  })

  it('parses a response from a server that predates Purchased credits', () => {
    expect(userBalanceSchema.safeParse({ creditsRemaining: 7 }).success).toBe(true)
  })

  it('accepts a negative total after an overage', () => {
    expect(userBalanceSchema.safeParse({ creditsRemaining: -3, purchasedCredits: 0 }).success).toBe(true)
  })

  it('rejects negative Purchased credits', () => {
    expect(userBalanceSchema.safeParse({ creditsRemaining: 5, purchasedCredits: -1 }).success).toBe(false)
  })
})
