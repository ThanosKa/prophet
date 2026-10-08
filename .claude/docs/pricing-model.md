# Prophet Pricing Model

Internal economics. Terms (Turn, Credit, Margin, Minimum charge, Free grant, Subscription credits, Purchased credits, Bonus) are defined in `GLOSSARY.md`. Every number below lives in `apps/marketing/lib/pricing.ts`; if they disagree, the code wins.

**Public copy never states the Margin percentage and never advertises a Bonus.** Describe Credits as pay-per-use. See `.claude/docs/product-marketing-context.md`.

## Quick summary

- 1 Credit = 1 cent.
- Each Turn costs Anthropic's cost × (1 + `MARGIN`), rounded up to whole Credits, and never less than `MINIMUM_CHARGE_CREDITS` (1). `MARGIN` is 0.25.
- Plans give no Bonus: a plan's Subscription credits equal its price.
- Every plan stays profitable after Stripe fees even when the subscriber spends every Credit.

| Tier | Price | Credits | Kind |
|------|------:|--------:|------|
| Free | $0 | 7 | Free grant, one-time on sign-up |
| Pro | $9.99/mo | 1000 | Subscription credits, reset at each renewal |
| Premium | $29.99/mo | 3000 | Subscription credits |
| Ultra | $59.99/mo | 6000 | Subscription credits |
| Extra credits | $10 one-time | 1000 | Purchased credits, never expire |

## How a Turn is charged

1. **Reserve** (`planCreditReservation` + `reserveCredits` in `lib/credit-reservation.ts`): estimate the Turn's input tokens and price it at the maximum output allowance. If the balance can't cover even the minimum output, answer 402 `INSUFFICIENT_BALANCE`. Otherwise shrink the output allowance to what the balance covers and hold that many Credits, Subscription credits first, then Purchased credits.
2. **Stream** the Turn from Anthropic.
3. **Settle** (`settleCredits`): price the Turn's real usage with `calculateUsageCostInCredits` (input, cache writes, cache reads, output, web searches). Return the unused hold Purchased-first; charge any overage to Subscription credits, which may go negative. The settlement and its `usageRecords` row land in one transaction.

### Example (Sonnet 5.5, 1,000 input + 500 output tokens, no cache)

```
Anthropic cost:  1000 × $2/MTok + 500 × $10/MTok = $0.002 + $0.005 = $0.007 = 0.7 cents
With the Margin: 0.7 × 1.25 = 0.875 cents
Rounded up:      1 Credit
```

Rounding up and the Minimum charge only ever bill more than cost plus the Margin, never less. Most short Haiku Turns cost the 1-Credit minimum.

## Credit balances

Two columns on `users` (see `.claude/docs/database-schema.md`):

- `creditsRemaining`: Subscription credits plus the Free grant. Renewal and a new subscription set it to the plan's Credits; cancellation lapses it to `least(current, Free grant)`. May go negative after an overage.
- `purchasedCredits`: Purchased credits. Only an extra-credits checkout adds to it (once per checkout, via `credit_purchases`); renewals, plan changes and cancellation leave it alone.

APIs return the total (`totalCredits()` in `lib/credit-balance.ts`) as `creditsRemaining`, plus `purchasedCredits` on its own so the UI can say how much never expires.

## Profit

### Worst case per charge

The worst case is a buyer who spends every Credit. Anthropic's cost is then at most Credits ÷ (1 + Margin). `calculateWorstCaseProfit({ price, credits })` computes it, and `lib/pricing.test.ts` asserts it is positive for every plan and for extra credits.

Stripe fee: 2.9% + $0.30 per charge.

| Charge | Price | Stripe fee | Max Anthropic cost | Worst-case profit |
|--------|------:|-----------:|-------------------:|------------------:|
| Pro | $9.99 | $0.59 | $8.00 | $1.40 (14%) |
| Premium | $29.99 | $1.17 | $24.00 | $4.82 (16%) |
| Ultra | $59.99 | $2.04 | $48.00 | $9.95 (17%) |
| Extra credits | $10.00 | $0.59 | $8.00 | $1.41 (14%) |

Unspent Subscription credits are extra profit; unspent Purchased credits stay owed to the user forever.

### Free grant

7 Credits cost at most 5.6 cents of Anthropic spend per user, and about 1-2 cents when spent on Haiku. The cheapest fresh-chat Sonnet Turn costs exactly 7 Credits and the cheapest Opus Turn 14, so copy promises only Haiku for the Free grant.

## Changing a number

Change `lib/pricing.ts`, then run `pnpm -F @prophet/marketing test:run`: the worst-case profit tests and `lib/pricing-copy.test.ts` (public copy, structured data and FAQ) will flag what else needs updating. The pricing page and the cost tools read the numbers from `lib/pricing.ts`; the blog, comparison pages, `public/llms.txt`, `public/llms-full.txt` and `public/pricing.md` state them as text.
