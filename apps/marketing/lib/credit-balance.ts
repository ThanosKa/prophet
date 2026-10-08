import { describeBalance, type BalanceDisplay } from '@prophet/shared'
import type { User } from '@/lib/db/schema'

type BalanceColumns = Pick<User, 'creditsRemaining' | 'purchasedCredits'>

/** A user's balance as shown everywhere: Subscription credits plus Purchased credits. */
export function totalCredits(user: BalanceColumns): number {
  return user.creditsRemaining + user.purchasedCredits
}

/** Both balances named, so pages never have to work one out from the other. */
export type Balance = { subscription: number; purchased: number; total: number }

/** Reads the balances from a DB user row, whose `creditsRemaining` is Subscription credits only. */
export function balanceOf(user: BalanceColumns): Balance {
  return {
    subscription: user.creditsRemaining,
    purchased: user.purchasedCredits,
    total: totalCredits(user),
  }
}

/**
 * The user row as clients see it: the DB column holds only Subscription credits, so
 * `creditsRemaining` is replaced by the total and `purchasedCredits` stays alongside it.
 */
export function withTotalBalance<T extends BalanceColumns>(user: T): T {
  return { ...user, creditsRemaining: totalCredits(user) }
}

/** The total and its never-expiring share, formatted for display. */
export function describeAccountBalance(balance: Balance): BalanceDisplay {
  return describeBalance({ creditsRemaining: balance.total, purchasedCredits: balance.purchased })
}
