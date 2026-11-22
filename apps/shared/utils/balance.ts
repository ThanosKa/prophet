import type { UserBalance } from '../schemas'

export interface BalanceDisplay {
  total: string
  neverExpiresNote: string | null
}

export function formatDollars(credits: number): string {
  const cents = Math.abs(credits)
  const dollars = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
  return credits < 0 ? `-$${dollars}` : `$${dollars}`
}

export function describeBalance(balance: UserBalance): BalanceDisplay {
  const neverExpires = Math.min(balance.purchasedCredits ?? 0, balance.creditsRemaining)

  return {
    total: formatDollars(balance.creditsRemaining),
    neverExpiresNote: neverExpires > 0 ? `Includes ${formatDollars(neverExpires)} that never expires` : null,
  }
}
