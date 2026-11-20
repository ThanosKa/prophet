import { describe, it, expect } from 'vitest'
import { APIError } from '@anthropic-ai/sdk'
import { describeTurnError } from './turn-stream'

/** The SDK's own factory, so the error has the exact class and message a real 400 has. */
function anthropicBadRequest(message: string) {
  return APIError.generate(
    400,
    { type: 'error', error: { type: 'invalid_request_error', message } },
    undefined,
    new Headers()
  )
}

describe('describeTurnError', () => {
  it.each([
    [
      'prompt is too long: 210000 tokens > 200000 maximum',
      'This chat is too long for the model. Start a new chat to continue.',
      'CONTEXT_TOO_LONG',
    ],
    [
      'messages.0.content.1.image.source.base64: image exceeds 5 MB maximum',
      'That image is too large or unsupported. Try a smaller image.',
      'IMAGE_INVALID',
    ],
    [
      'messages: roles must alternate',
      "Claude couldn't process this request. Start a new chat and try again.",
      'ANTHROPIC_INVALID_REQUEST',
    ],
  ])('words an invalid request (%s)', (message, error, code) => {
    expect(describeTurnError(anthropicBadRequest(message))).toEqual({ type: 'error', error, code })
  })

  it('asks for a minute on an Anthropic rate limit that says to try again later', () => {
    expect(describeTurnError(new Error('429 rate_limit_error: please try again later'))).toEqual({
      type: 'error',
      error: 'AI service is temporarily busy. Please wait a moment and try again.',
      code: 'ANTHROPIC_RATE_LIMIT',
      details: { retryAfter: 60 },
    })
  })

  it('leaves the retry out of a rate limit that names no wait', () => {
    expect(JSON.stringify(describeTurnError(new Error('429 {"type":"rate_limit_error"}')))).toBe(
      '{"type":"error","error":"AI service is temporarily busy. Please wait a moment and try again.","code":"ANTHROPIC_RATE_LIMIT"}'
    )
  })

  it.each([
    ['529 overloaded_error', 'AI service is experiencing high demand. Please try again in a few minutes.', 'ANTHROPIC_OVERLOADED'],
    ['401 authentication_error: invalid x-api-key', 'Service configuration error. Please contact support.', 'ANTHROPIC_AUTH_ERROR'],
    ['socket hang up', 'Something went wrong. Please try again.', 'STREAMING_ERROR'],
  ])('classifies %s', (message, error, code) => {
    expect(describeTurnError(new Error(message))).toEqual({ type: 'error', error, code })
  })

  it('sends only the generic text for a value that is not an Error', () => {
    expect(JSON.stringify(describeTurnError('stream ended'))).toBe(
      '{"type":"error","error":"Something went wrong. Please try again."}'
    )
  })
})
