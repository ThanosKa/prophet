---
name: supabase-drizzle
description: Database operations with Drizzle ORM and Supabase PostgreSQL. Use when designing schemas, writing queries, creating migrations, or implementing usage tracking.
---

# Supabase + Drizzle ORM

## When to Use
- Designing or modifying database schema
- Writing database queries
- Creating/running migrations
- Implementing SaaS usage tracking
- Setting up database connections

## Connection Setup

### db/index.ts
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false, // Required for Supabase connection pooling
})

export const db = drizzle(client, { schema })
```

### drizzle.config.ts
```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

## Schema Design

### Core Tables
```typescript
// lib/db/schema.ts
import { pgTable, text, timestamp, integer, uuid, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const tierEnum = pgEnum('tier', ['free', 'pro', 'premium', 'ultra'])

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull(),
  tier: tierEnum('tier').default('free').notNull(),
  creditsRemaining: integer('credits_remaining').default(50000).notNull(), // tokens
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').default('New Chat').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const usageRecords = pgTable('usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokensUsed: integer('tokens_used').notNull(),
  model: text('model').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
```

### Relations
```typescript
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  usageRecords: many(usageRecords),
}))

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, { fields: [chats.userId], references: [users.id] }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
}))
```

## Query Patterns

### Select with Relations
```typescript
// Get user's chats with message count
const userChats = await db.query.chats.findMany({
  where: eq(chats.userId, userId),
  with: { messages: true },
  orderBy: [desc(chats.updatedAt)],
})
```

### Insert
```typescript
const [newChat] = await db.insert(chats)
  .values({ userId, title: 'New Chat' })
  .returning()
```

### Update
```typescript
await db.update(users)
  .set({ creditsRemaining: sql`${users.creditsRemaining} - ${tokensUsed}` })
  .where(eq(users.id, userId))
```

### Transaction
```typescript
await db.transaction(async (tx) => {
  // Create message
  await tx.insert(messages).values({ chatId, role, content, outputTokens })

  // Deduct credits
  await tx.update(users)
    .set({ creditsRemaining: sql`${users.creditsRemaining} - ${outputTokens}` })
    .where(eq(users.id, userId))

  // Record usage
  await tx.insert(usageRecords).values({ userId, tokensUsed: outputTokens, model })
})
```

## Migration Commands
```bash
# Generate migration from schema changes
pnpm -F @prophet/backend db:generate

# Apply migrations
pnpm -F @prophet/backend db:migrate

# Open Drizzle Studio (GUI)
pnpm -F @prophet/backend db:studio
```

## Anti-Patterns
- Don't use raw SQL strings (use drizzle operators)
- Never store Clerk user data beyond ID (sync on webhook)
- Don't forget `prepare: false` for Supabase pooler
- Avoid N+1 queries (use relations/joins)

## Type Inference
```typescript
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Chat = InferSelectModel<typeof chats>
export type Message = InferSelectModel<typeof messages>
```
