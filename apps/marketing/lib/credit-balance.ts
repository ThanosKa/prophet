import type { User } from '@/lib/db/schema'

type BalanceColumns = Pick<User, 'creditsRemaining' | 'purchasedCredits'>

/** A user's balance as shown everywhere: Subscription credits plus Purchased credits. */
export function totalCredits(user: BalanceColumns): number {
  return user.creditsRemaining + user.purchasedCredits
}

/**
 * The user row as clients see it: the DB column holds only Subscription credits, so
 * `creditsRemaining` is replaced by the total and `purchasedCredits` stays alongside it.
 */
export function withTotalBalance<T extends BalanceColumns>(user: T): T {
  return { ...user, creditsRemaining: totalCredits(user) }
}
