# Spec: Pricing, credits and usage overhaul

Status: ready-for-agent · Decided 2026-10-08 · Vocabulary: see `GLOSSARY.md`

Depends on the Claude Haiku 5.5 migration, which ships first in its own PR.

## Problem Statement

As the owner of Prophet, I can't tell whether I make money. The Margin is 20%, but every plan gives a Bonus (pay $9.99, get $11 of Credits), so the Bonus eats most of the Margin. After Stripe fees, a subscriber who spends every Credit leaves only 3-6% profit. The site also says publicly that Prophet charges "Anthropic API cost plus a 20% margin". That isn't accurate, because of the Minimum charge of 1 Credit per Turn.

As a user, I can lose money I paid for. Purchased credits are overwritten in three places: at plan renewal, when a Free user starts a plan, and when a plan is cancelled. Nothing on the site says that Credits expire.

As a user, I can't read my usage. The Usage page shows one row per Turn, so one Run shows up as several rows. Rows show the date without a time. The token counts leave out cached input, so they look tiny next to the cost.

As a user, a long Run pauses every 10 Turns and I have to type "continue".

## Solution

- The Margin becomes **25%**, on every Turn, whichever kind of Credits pays for it.
- Plans give **no Bonus**: Pro $9.99 → 1000 Credits, Premium $29.99 → 3000, Ultra $59.99 → 6000. Prices are unchanged.
- The Free grant becomes **7 Credits** for new users. Existing users keep their balance.
- The Minimum charge stays at **1 Credit per Turn**.
- The Turn limit becomes **20**.
- **Purchased credits never expire.** They are a separate balance from Subscription credits. A Turn spends Subscription credits first, then Purchased credits.
- The **Usage page shows daily totals per model**: date, model, number of Turns, tokens including cached input, and Credits spent.
- The site **stops stating a Margin percentage** and stops advertising a Bonus. All copy about the free amount and plan Credits is updated.

There are no paying subscribers today (all 854 users are on Free; checked 2026-10-08), so nobody needs to be notified or migrated.

## User Stories

1. As a new user, I want to receive a Free grant of 7 Credits on sign-up, so that I can try Prophet without a card.
2. As an existing Free user, I want my current balance left untouched when the Free grant changes, so that I don't lose Credits I already have.
3. As a Free user, I want a clear message when my balance can't cover a Turn on the model I picked, so that I know to switch to Haiku or upgrade.
4. As a Free user whose balance can't cover Sonnet or Opus, I want to be offered Haiku, so that I can keep going.
5. As a Pro subscriber, I want 1000 Subscription credits every billing period, so that my plan gives exactly what I pay for.
6. As a Premium subscriber, I want 3000 Subscription credits every billing period.
7. As an Ultra subscriber, I want 6000 Subscription credits every billing period.
8. As a subscriber, I want my Subscription credits replaced at each renewal, so that the plan behaves the same every month.
9. As a subscriber, I want my Purchased credits to survive a renewal, so that I don't lose what I paid for.
10. As a Free user who bought Credits, I want them kept when I start a plan, so that subscribing doesn't wipe my purchase.
11. As a subscriber who cancels, I want my Purchased credits kept, so that I can still use them on Free.
12. As a subscriber who cancels, I want my Subscription credits to lapse to at most the Free grant, as they do today.
13. As a subscriber who upgrades or downgrades, I want my Purchased credits untouched by the plan change.
14. As a user with both kinds of Credits, I want each Turn to spend Subscription credits first, so that the Credits that never expire last longest.
15. As a user, I want my balance shown as one total (Subscription plus Purchased), so that I don't have to add two numbers.
16. As a user, I want to see how much of my total is Purchased credits that never expire, so that I know what carries over.
17. As a user buying Credits, I want 1000 Credits for $10, as today.
18. As a user, I want every Turn to cost Anthropic's cost plus the Margin, rounded up, and never less than the Minimum charge.
19. As a user whose Turn costs more than its reservation, I want the overage taken from Subscription credits first, then Purchased credits, and to see a negative balance only if both run out. This matches today's behaviour.
20. As a user whose Turn costs less than its reservation, I want the unused hold returned to the balance it came from.
21. As a user, I want the agent to run up to 20 Turns before pausing, so that long tasks finish without me typing "continue".
22. As a user, I want the pause message to state the real Turn limit.
23. As a user on an older extension build, I want my Runs to keep working after the server raises the Turn limit.
24. As a user, I want the Usage page to show one row per day per model, so that I can see where my Credits went.
25. As a user, I want each daily row to show the number of Turns, so that I understand why one question cost several Credits.
26. As a user, I want token counts that include cached input, so that tokens and cost agree.
27. As a user, I want the Usage page to page through older days.
28. As a visitor, I want the pricing page to show each plan's price and the Credits it includes, with no Bonus percentage.
29. As a visitor, I want the site to describe Credits as pay-per-use, without stating a Margin percentage.
30. As a visitor, I want the FAQ to say the Free grant is one-time, Subscription credits renew monthly and don't roll over, Purchased credits never expire, and every Turn costs at least 1 Credit.
31. As a visitor, I want the free-plan description to say the Free grant is enough to try Haiku, without promising Sonnet or Opus messages.
32. As a visitor reading comparison pages, I want the Prophet pricing claims there to match the real pricing.
33. As an AI assistant reading `llms.txt`, `llms-full.txt` and `pricing.md`, I want pricing facts that match the product.
34. As the owner, I want every plan to stay profitable even when a subscriber spends every Credit, after Stripe fees.
35. As the owner, I want the change made while there are no paying subscribers, so that no customer is affected.
36. As the owner, I want the schema change applied to production before the code that needs it is deployed, because production migrations are applied by hand.
37. As the owner, I want the server deployed before the extension that raises the Turn limit.
38. As a developer, I want `GLOSSARY.md` terms used in code and copy where practical, so that "turn", "step" and "message" aren't mixed up.

## Implementation Decisions

**Pricing module**
- Margin constant goes from 1.20 to 1.25. The Minimum charge stays at 1 Credit and rounding stays "round up".
- Tier config: free 7, pro 1000, premium 3000, ultra 6000 Credits. Every Bonus field is 0 (or the field is removed if nothing reads it). The extra-credits product stays at 1000 Credits for $10.
- The guaranteed-profit helper and its stale "5% of API pool" comment are rewritten for the new numbers. Its tests assert profit is at least 0 after Stripe fees in every plan's worst case.

**Two credit balances (schema change)**
- Add a non-negative integer column for Purchased credits on `users`, default 0. The existing balance column keeps holding Subscription credits (and the Free grant), and may go negative as today.
- Backfill: none. No user has Purchased credits that are known to be separate today.
- The extra-credits webhook adds to Purchased credits only.
- Renewal sets Subscription credits to the plan's amount and leaves Purchased credits alone.
- A new subscription sets Subscription credits to the plan's amount and leaves Purchased credits alone.
- Cancellation lapses Subscription credits to `least(current, free grant)` and leaves Purchased credits alone.
- The credit reservation (reserve-then-settle) checks against the combined balance. It takes the hold from Subscription credits first, then Purchased credits, and records how much came from each. On settlement it refunds the unused hold Purchased-first. Overage (user story 19) is taken from Subscription credits down to 0, then from Purchased credits down to 0; only what both can't cover pushes Subscription credits negative. Purchased credits never go below 0. Reserve and settle are each a single `UPDATE` whose split is computed in SQL, with conditional `WHERE` guards; settlement stays in one transaction with the usage record.
- Every API that returns the user's balance returns the total, plus Purchased credits as a separate field. Shared Zod schemas are updated, and the new field is optional so older extension builds still parse the response.
- Production migrations are applied by hand. The SQL is run on production before merging to `main` (Vercel auto-deploys `main`).

**Turn limit**
- The shared max-Turns constant goes from 10 to 20. The server schema validates against it, so a server that accepts 20 still accepts older builds that send up to 10.
- The sidepanel pause text is built from the constant instead of hard-coding "10".
- Deploy order: server, then a new extension version.

**Usage page**
- The usage API gets a daily aggregation: group by UTC day and model; sum Turns (row count), input, cache-write, cache-read and output tokens, and Credits. It is paged by day, newest first. The existing per-row endpoint behaviour can be kept behind a parameter or replaced; nothing else reads it.
- The UI table columns are Day, Model, Turns, Tokens (input + cache write + cache read + output) and Credits.

**Copy and docs**
- Remove every "API cost plus a 20% margin" statement (marketing pages, comparisons, `llms*.txt`, `pricing.md`, blog, FAQ, structured data).
- Remove every "+10% / +17% bonus" claim and every "$11 / $35 / $70 in credits" figure; plan Credits now equal the price.
- Change "$0.20 free" to "$0.07 free" and fix the message-count claims (FAQ: "~20 Haiku / 10 Sonnet / 4 Opus").
- Add FAQ entries for Credit expiry rules and the Minimum charge.
- Update `CLAUDE.md` (SaaS model line), `.claude/docs/pricing-model.md` and `.claude/docs/database-schema.md`.

## Testing Decisions

- Work test-first (`/tdd`): write a failing test at the seam, make it pass, refactor.
- Good tests assert external behaviour: Credits charged, balances after a webhook, rows returned by an API, events yielded by the agent loop. They don't assert internal helper calls or SQL text.
- Seams, all existing:
  1. **Pricing module** (pure unit tests): Margin, rounding, Minimum charge, tier Credits, Free grant, worst-case profit per plan.
  2. **Agent chat route** with pglite (prior art: the route's credit tests and the credit reservation DB tests): spend order across the two balances, hold and settle split, overage (Subscription credits, then Purchased credits, then a negative Subscription balance), insufficient-balance responses with a 7-Credit Free user.
  3. **Stripe webhook route** (prior art: its route test): renewal, new subscription, cancellation and extra-credit purchase each leave Purchased credits correct.
  4. **Usage API route** (prior art: its route test): daily totals per model, token sums including cache, paging.
  5. **Sidepanel agent loop** (prior art: its loop test): pauses after 20 Turns with the right message.
- Copy is checked by the existing content tests where they cover it (blog tests). Otherwise it is checked with a repo-wide search for the old numbers.

## Out of Scope

- Fractional Credits, that is, removing the Minimum charge.
- Grouping usage per Run, which needs a run or chat id on usage rows. That comes later.
- Credits in the usage CSV export.
- Stripe prices, Stripe Tax and VAT. The owner confirmed VAT doesn't apply today.
- The context meter cap (200K → 1M) and other leftovers from the Haiku 5.5 migration.
- Investigating why the 4 past subscribers cancelled.
- Re-enabling email sign-up.

## Further Notes

- Production check (read-only, 2026-10-08): 854 users, all on Free. 4 users had a Stripe customer and all cancelled between April and July. There is no evidence that any of them bought extra Credits, but Stripe live data wasn't available (the local key is test-mode). To confirm, check the live Stripe dashboard for $10 one-time payments from those customers.
- Worst-case profit per plan after Stripe fees (about 2.9% + $0.30) at 25% Margin with no Bonus: Pro about $1.40 (14%), Premium about $4.80 (16%), Ultra about $9.90 (17%), $10 extra credits about $1.41 (14%).
- The Free grant costs at most about 5.6 cents of Anthropic spend per user, and about 1-2 cents when spent on Haiku.
