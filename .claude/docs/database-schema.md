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
charges any overage to `creditsRemaining` only.

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
  createdAt: timestamp
}
```

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
- **users → messages**: Indirect via chats

## Database Commands

```bash
pnpm -F @prophet/marketing db:generate  # Generate migrations from schema
pnpm -F @prophet/marketing db:migrate   # Apply migrations
pnpm -F @prophet/marketing db:studio    # Open Drizzle Studio GUI
```
