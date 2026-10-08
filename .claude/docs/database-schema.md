# Database Schema

Core database tables using Drizzle ORM with Supabase PostgreSQL.

## Users

```typescript
users {
  id: string                           // Clerk user ID
  email: string
  firstName: string
  lastName: string
  profileImageUrl: string
  tier: 'free' | 'pro' | 'premium' | 'ultra'
  creditsRemaining: number             // Subscription credits + Free grant (cents); may go negative after an overage
  purchasedCredits: number             // Purchased credits (cents); never expire, CHECK >= 0, default 0
  creditsIncluded: number              // Monthly allocation (cents)
  billingPeriodStart: timestamp
  billingPeriodEnd: timestamp
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  pendingTier: 'free' | 'pro' | 'premium' | 'ultra'  // For downgrades
  pendingTierEffectiveDate: timestamp                 // When pendingTier takes effect
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Two credit balances

A user's balance is `creditsRemaining + purchasedCredits`; APIs return that total as
`creditsRemaining` plus `purchasedCredits` on its own (`totalCredits()` in
`apps/marketing/lib/credit-balance.ts`). `reserveCredits` checks a Turn's hold against
the total and takes it Subscription credits first, then Purchased credits, returning the
split as a `CreditHold`. `settleCredits` returns the unused hold Purchased-first and
takes any overage from `creditsRemaining` down to 0, then `purchasedCredits` down to 0;
only the remainder pushes `creditsRemaining` negative. Both are single SQL-expression
`UPDATE`s that compute the split in SQL.

Stripe webhooks never touch `purchasedCredits` except to add a purchase: renewal and a new
subscription set `creditsRemaining` to the plan's Credits, plan changes leave it alone, and
cancellation lapses it to `least(creditsRemaining, Free grant)`.

## Credit Purchases

```typescript
creditPurchases {
  stripeCheckoutSessionId: string  // PK; a redelivered checkout.session.completed adds nothing
  userId: string                   // FK → users.id (cascade delete)
  credits: number                  // Purchased credits added by this checkout
  createdAt: timestamp
}
```

## Chats

```typescript
chats {
  id: uuid
  userId: string          // FK → users.id (cascade delete)
  title: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Messages

```typescript
messages {
  id: uuid
  chatId: uuid            // FK → chats.id (cascade delete)
  role: 'user' | 'assistant'
  content: text
  model: string           // resolved model actually called, e.g. 'claude-sonnet-5-5'
  inputTokens: number
  outputTokens: number
  costCents: number       // Actual API cost in cents
  toolCalls: text | null  // JSON string, see below
  createdAt: timestamp    // clock_timestamp(), so rows keep their real order under the chat lock
}
```

- **One assistant row per Run.** A Run's user row is saved when the Run starts, before
  its first Turn. Its assistant row is the first assistant row after that user row:
  inserted at the end of the first Turn with text or released tool calls, then updated
  after every Turn, including a Stop, disconnect or error. `content` is the Run's
  visible text so far; tokens and cost add up over the Run's Turns. A refused Turn adds
  a fixed "Claude declined" note instead of its text and tool calls.
- **`tool_calls`** holds every tool call the server released to the extension during the
  Run, oldest first: `[{ type: 'tool_use', id, name, input, isError? }]`. `isError` is
  filled in from the call's `tool_result` when the next Turn arrives. Tool results are
  never stored. Read it only through `parseStoredToolCalls` (`@prophet/shared`), which
  validates it with `storedToolCallSchema`.
- Every transaction that writes a Run's record locks the chat row first, then the user row.

## Usage Records

```typescript
usageRecords {
  id: uuid
  userId: string          // FK → users.id (cascade delete)
  inputTokens: number     // Uncached input only (Anthropic `input_tokens`)
  cacheCreationInputTokens: number  // Prompt-cache writes (billed 1.25x input)
  cacheReadInputTokens: number      // Prompt-cache reads (0.1x input, 0.05x on Opus 5.5 / Sonnet 5.5)
  outputTokens: number
  costCents: number       // Actual API cost in cents
  model: string
  createdAt: timestamp
}
```

## Relationships

- **users → chats**: One-to-many (cascade delete)
- **chats → messages**: One-to-many (cascade delete)
- **users → usageRecords**: One-to-many (cascade delete)
- **users → creditPurchases**: One-to-many (cascade delete)
- **users → messages**: Indirect via chats

## Database Commands

```bash
pnpm -F @prophet/marketing db:generate  # Generate migrations from schema
pnpm -F @prophet/marketing db:migrate   # Apply migrations
pnpm -F @prophet/marketing db:studio    # Open Drizzle Studio GUI
```

## Migrations

- The production migration journal (`drizzle.__drizzle_migrations`) is complete: it records every migration in `lib/db/migrations/meta/_journal.json` (0000-0007, fixed on 2026-10-08).
- A schema change goes through `db:generate`, then `db:migrate` against production, before the branch merges to `main`. Vercel deploys `main` automatically, so code that needs a column must never reach `main` before its migration.
- Nobody runs `db:push` against production. It changes the schema without recording a journal row, which is how the journal drifted.
- SQL files that were never in the journal live in `docs/db/legacy-sql/` for reference only.
