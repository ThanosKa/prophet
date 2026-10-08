import type { UserBalance } from '../schemas'

export interface BalanceDisplay {
  /** The total balance in dollars, e.g. "$13" or "$12.57". */
  total: string
  /** How much of the total is Purchased credits, or null when there is nothing to say. */
  neverExpiresNote: string | null
}

/** Shows Credits (cents) as dollars, with cents only when needed: "$10", "$0.07", "-$10.50". */
export function formatDollars(credits: number): string {
  const cents = Math.abs(credits)
  const dollars = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
  return credits < 0 ? `-$${dollars}` : `$${dollars}`
}

/** Formats a total balance (Credits are cents) and the share of it that never expires. */
export function describeBalance(balance: UserBalance): BalanceDisplay {
  // Negative Subscription credits make the total smaller than Purchased credits;
  // the note never claims more than the total.
  const neverExpires = Math.min(balance.purchasedCredits ?? 0, balance.creditsRemaining)

  return {
    total: formatDollars(balance.creditsRemaining),
    neverExpiresNote: neverExpires > 0 ? `Includes ${formatDollars(neverExpires)} that never expires` : null,
  }
}
