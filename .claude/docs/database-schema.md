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
  creditsRemaining: number             // Current balance (cents)
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
  model: string           // e.g., 'claude-sonnet-4-20250514'
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
  inputTokens: number
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
pnpm -F @prophet/backend db:generate  # Generate migrations from schema
pnpm -F @prophet/backend db:migrate   # Apply migrations
pnpm -F @prophet/backend db:studio    # Open Drizzle Studio GUI
```
