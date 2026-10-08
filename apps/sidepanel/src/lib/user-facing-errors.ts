import { z } from 'zod'
import { AGENT_SIZE_LIMITS, MAX_AGENT_TURNS, RUN_SUPERSEDED_MESSAGE, currentAgentModelSchema } from '@prophet/shared'

// Base64 spends 4 characters on every 3 bytes.
const ATTACHED_IMAGE_MB = (AGENT_SIZE_LIMITS.attachedImageChars * 3) / 4 / 1_000_000

export const USER_FACING_TEXT = {
  imageTooLarge: 'That image is too large to send. Try a smaller one.',
  imageTooLargeToAttach: `That image is too large to attach. Use one under ${ATTACHED_IMAGE_MB} MB, for example a smaller screenshot.`,
  imageTypeUnsupported: 'Only JPEG, PNG, GIF or WebP images can be attached.',
  serverUnavailable: "Prophet's server didn't respond. Please try again.",
  generic: 'Something went wrong. Please try again.',
  streamCut: 'The response stopped unexpectedly. Please try again.',
  truncated: 'This answer hit the length limit and was cut short. Send "continue" for the rest.',
  truncatedLowBalance:
    'This answer was cut short because your balance is low. Buy credits or switch to Haiku 5.5 for full-length answers.',
  turnLimit: `Prophet paused after ${MAX_AGENT_TURNS} turns. Send "continue" to keep going.`,
  runBudget: 'Prophet paused because this task grew too long for one run. Send "continue" to keep going.',
  requestTooLarge: 'This task grew too large to send, so Prophet stopped here. Send "continue" to keep going.',
  runSuperseded: RUN_SUPERSEDED_MESSAGE,
  network: "Can't reach Prophet. Check your connection and try again.",
  browserConnection: 'Prophet lost its connection to the browser. Reopen the side panel and try again.',
} as const

// Each field degrades to undefined on its own, so one malformed field from an older or newer server
// never discards the rest of the details.
const errorDetailsSchema = z.object({
  pricingUrl: z.string().optional().catch(undefined),
  retryAfter: z.number().optional().catch(undefined),
  remaining: z.number().optional().catch(undefined),
  isContinuation: z.boolean().optional().catch(undefined),
  suggestedModel: currentAgentModelSchema.optional().catch(undefined),
  suggestDisableThinking: z.boolean().optional().catch(undefined),
  canUpgrade: z.boolean().optional().catch(undefined),
})

export type ErrorDetails = z.infer<typeof errorDetailsSchema>

export type ErrorInfo = Pick<ErrorDetails, 'pricingUrl' | 'suggestedModel' | 'suggestDisableThinking' | 'canUpgrade'> & {
  code?: string
}

export function parseErrorDetails(raw: unknown): ErrorDetails | undefined {
  const parsed = errorDetailsSchema.safeParse(raw)
  return parsed.success ? parsed.data : undefined
}

const errorBodySchema = z.object({
  error: z.string().min(1).optional().catch(undefined),
  code: z.string().optional().catch(undefined),
  details: errorDetailsSchema.optional().catch(undefined),
})

export type ErrorBody = z.infer<typeof errorBodySchema>

export function parseErrorBody(raw: unknown): ErrorBody {
  const parsed = errorBodySchema.safeParse(raw)
  return parsed.success ? parsed.data : {}
}

export function describeHttpFailure({ status, body }: { status: number; body: ErrorBody }): string {
  if (body.error) return body.error
  if (status === 413) return USER_FACING_TEXT.imageTooLarge
  return USER_FACING_TEXT.serverUnavailable
}

const NETWORK_ERROR_PATTERN = /failed to fetch|networkerror|network error/i
const BROWSER_CONNECTION_PATTERN = /could not establish connection|receiving end does not exist|extension context invalidated/i

// Thrown when the message is already written for the user, so describeThrownError passes it through.
export class UserFacingError extends Error {}

export function describeThrownError(error: unknown): string {
  if (error instanceof UserFacingError) return error.message
  const message = error instanceof Error ? error.message : String(error)
  if (NETWORK_ERROR_PATTERN.test(message)) return USER_FACING_TEXT.network
  if (BROWSER_CONNECTION_PATTERN.test(message)) return USER_FACING_TEXT.browserConnection
  return USER_FACING_TEXT.generic
}
