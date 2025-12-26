import { relations } from 'drizzle-orm'
import { pgTable, uuid, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'

// Enums
export const tierEnum = pgEnum('tier', ['free', 'pro', 'premium', 'ultra'])
export const roleEnum = pgEnum('role', ['user', 'assistant'])

// Users table
export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(), // Clerk user ID
    email: text('email').notNull(),
    tier: tierEnum('tier').notNull().default('free'),
    creditsRemaining: integer('credits_remaining').notNull().default(50000), // ~50K tokens for free tier
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('users_email_idx').on(table.email),
    index('users_tier_idx').on(table.tier),
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
      .references(() => chats.id, { onDelete: 'cascade' }), // Cascade delete messages when chat is deleted
    role: roleEnum('role').notNull(),
    content: text('content').notNull(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
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
      .references(() => users.id, { onDelete: 'cascade' }), // Cascade delete usage records when user is deleted
    tokensUsed: integer('tokens_used').notNull(),
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
