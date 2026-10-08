import type { User } from '@/lib/db/schema'

/** A user's balance as shown everywhere: Subscription credits plus Purchased credits. */
export function totalCredits(user: Pick<User, 'creditsRemaining' | 'purchasedCredits'>): number {
  return user.creditsRemaining + user.purchasedCredits
}
