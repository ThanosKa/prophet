import { describeBalance, type BalanceDisplay } from '@prophet/shared'
import type { User } from '@/lib/db/schema'

type BalanceColumns = Pick<User, 'creditsRemaining' | 'purchasedCredits'>

export function totalCredits(user: BalanceColumns): number {
  return user.creditsRemaining + user.purchasedCredits
}

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

export function describeAccountBalance(balance: Balance): BalanceDisplay {
  return describeBalance({ creditsRemaining: balance.total, purchasedCredits: balance.purchased })
}
