import { APIError, BadRequestError } from '@anthropic-ai/sdk'

/** The frame that ends a Turn cut short by an error. Undefined fields are left out of the JSON. */
export type ErrorFrame = {
  type: 'error'
  error: string
  code?: string
  details?: Record<string, unknown>
}

function describeInvalidRequest(err: unknown): { message: string; code: string } | null {
  if (!(err instanceof Error)) return null
  const isInvalidRequest =
    err instanceof BadRequestError ||
    (err instanceof APIError && err.type === 'invalid_request_error') ||
    err.message.includes('invalid_request')
  if (!isInvalidRequest) return null

  const text = err.message.toLowerCase()
  if (
    text.includes('prompt is too long') ||
    text.includes('too many tokens') ||
    text.includes('context')
  ) {
    return {
      message: 'This chat is too long for the model. Start a new chat to continue.',
      code: 'CONTEXT_TOO_LONG',
    }
  }
  if (text.includes('image')) {
    return {
      message: 'That image is too large or unsupported. Try a smaller image.',
      code: 'IMAGE_INVALID',
    }
  }
  return {
    message: "Claude couldn't process this request. Start a new chat and try again.",
    code: 'ANTHROPIC_INVALID_REQUEST',
  }
}

/**
 * The user-facing error frame for a Turn cut short by `err`: never the raw error, which
 * goes to the log instead.
 */
export function describeTurnError(err: unknown): ErrorFrame {
  let userFriendlyError = 'Something went wrong. Please try again.'
  let errorCode: string | undefined
  let errorDetails: Record<string, unknown> | undefined

  const invalidRequest = describeInvalidRequest(err)
  if (invalidRequest) {
    userFriendlyError = invalidRequest.message
    errorCode = invalidRequest.code
  } else if (err instanceof Error) {
    const errMessage = err.message

    // Handle Anthropic rate limit errors (429)
    if (errMessage.includes('rate_limit_error') || errMessage.startsWith('429')) {
      userFriendlyError = 'AI service is temporarily busy. Please wait a moment and try again.'
      errorCode = 'ANTHROPIC_RATE_LIMIT'
      // Try to extract retry info from error
      const retryMatch = errMessage.match(/try again later/i)
      if (retryMatch) {
        errorDetails = { retryAfter: 60 }
      }
    }
    // Handle Anthropic overloaded errors (529)
    else if (errMessage.includes('overloaded') || errMessage.startsWith('529')) {
      userFriendlyError = 'AI service is experiencing high demand. Please try again in a few minutes.'
      errorCode = 'ANTHROPIC_OVERLOADED'
    }
    // Handle authentication errors
    else if (errMessage.includes('authentication') || errMessage.includes('api_key')) {
      userFriendlyError = 'Service configuration error. Please contact support.'
      errorCode = 'ANTHROPIC_AUTH_ERROR'
    }
    // For other errors, use a generic message (don't expose raw error to user)
    else {
      userFriendlyError = 'Something went wrong. Please try again.'
      errorCode = 'STREAMING_ERROR'
    }
  }

  return {
    type: 'error',
    error: userFriendlyError,
    code: errorCode,
    details: errorDetails,
  }
}
