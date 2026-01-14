import { relations } from 'drizzle-orm'
import { pgTable, uuid, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'

// Enums
export const userTierEnum = pgEnum('user_tier', ['free', 'pro', 'premium', 'ultra'])
export const messageRoleEnum = pgEnum('message_role', ['user', 'assistant'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete',
])

// Users table
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    profileImageUrl: text('profile_image_url'),

    tier: userTierEnum('tier').notNull().default('free'),
    creditsRemaining: integer('credits_remaining').notNull().default(0),
    creditsIncluded: integer('credits_included').notNull().default(0),
    billingPeriodStart: timestamp('billing_period_start', { withTimezone: true }),
    billingPeriodEnd: timestamp('billing_period_end', { withTimezone: true }),

    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripePriceId: text('stripe_price_id'),
    subscriptionStatus: subscriptionStatusEnum('subscription_status'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_tier_idx').on(table.tier),
    index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
  ]
)

// Chats table
export const chats = pgTable(
  'chats',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // Cascade delete chats when user is deleted
    title: text('title').notNull(),
    contextTokens: integer('context_tokens').notNull().default(0),
    contextInputTokens: integer('context_input_tokens').notNull().default(0),
    contextOutputTokens: integer('context_output_tokens').notNull().default(0),
    contextReasoningTokens: integer('context_reasoning_tokens').notNull().default(0),
    contextCachedInputTokens: integer('context_cached_input_tokens').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('chats_user_id_idx').on(table.userId),
    index('chats_created_at_idx').on(table.createdAt),
  ]
)

// Messages table
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),
    content: text('content').notNull(),
    model: text('model'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    costCents: integer('cost_cents'),
    toolCalls: text('tool_calls'), // Store as JSON string
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('messages_chat_id_idx').on(table.chatId),
    index('messages_created_at_idx').on(table.createdAt),
  ]
)

// Usage records table
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    costCents: integer('cost_cents').notNull(),
    model: text('model').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('usage_records_user_id_idx').on(table.userId),
    index('usage_records_created_at_idx').on(table.createdAt),
  ]
)

// Relations (for Drizzle ORM query builder)
export const usersRelations = relations(users, ({ many }) => ({
  chats: many(chats),
  usageRecords: many(usageRecords),
}))

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}))

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  user: one(users, {
    fields: [usageRecords.userId],
    references: [users.id],
  }),
}))

// Type exports for use in application
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Chat = typeof chats.$inferSelect
export type NewChat = typeof chats.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type UsageRecord = typeof usageRecords.$inferSelect
export type NewUsageRecord = typeof usageRecords.$inferInsert
