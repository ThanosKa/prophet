import { z } from 'zod'

export * from './agent'
export * from './usage'
export * from './stored-tool-call'

export const createChatSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
})

export const updateChatSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
})

export const createMessageSchema = z.object({
  chatId: z.string().uuid('Invalid chat ID'),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message must be less than 10000 characters'),
})

export const streamMessageSchema = z.object({
  chatId: z.string().uuid('Invalid chat ID'),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message must be less than 10000 characters'),
})

export const updateUserSchema = z.object({
  tier: z.enum(['free', 'pro', 'premium', 'ultra']).optional(),
  creditsRemaining: z.number().int().min(0).optional(),
})

export const userBalanceSchema = z.object({
  creditsRemaining: z.number().int(),
  purchasedCredits: z.number().int().min(0).optional(),
})

export type CreateChatInput = z.infer<typeof createChatSchema>
export type UpdateChatInput = z.infer<typeof updateChatSchema>
export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type StreamMessageInput = z.infer<typeof streamMessageSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserBalance = z.infer<typeof userBalanceSchema>
