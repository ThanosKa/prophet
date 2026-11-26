import type { ErrorEvent } from '@sentry/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

const sentry = vi.hoisted(() => ({ captureException: vi.fn(), captureMessage: vi.fn() }))

vi.mock('@sentry/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@sentry/core')>()),
  ...sentry,
}))

const { ERROR_TRACKING_DSN, errorTrackingSettings, redact, reportErrorLog, scrubBreadcrumb, scrubEvent } =
  await import('./error-tracking')

describe('errorTrackingSettings', () => {
  it('stays off when the environment flag is unset, as in local dev', () => {
    expect(errorTrackingSettings({ environment: undefined, release: undefined })).toEqual({ enabled: false })
  })

  it('stays off for an unknown environment', () => {
    expect(errorTrackingSettings({ environment: 'staging', release: 'abc' })).toEqual({ enabled: false })
  })

  it('sends errors only, tagged with the environment and release, without personal data', () => {
    expect(errorTrackingSettings({ environment: 'production', release: 'abc123' })).toMatchObject({
      enabled: true,
      dsn: ERROR_TRACKING_DSN,
      environment: 'production',
      release: 'abc123',
      tracesSampleRate: 0,
      dataCollection: { userInfo: false, cookies: false, httpBodies: [], urlQueryParams: false, databaseQueryData: false },
    })
  })

  it('leaves the release unset when the build has none', () => {
    expect(errorTrackingSettings({ environment: 'development', release: '' })).toMatchObject({
      enabled: true,
      release: undefined,
    })
  })
})

describe('redact', () => {
  it('removes emails, tokens, keys, Clerk user IDs and screenshots', () => {
    expect(
      redact(
        'a.b+c@example.com Bearer abc.def sk-ant-api03-abcdefgh sk_live_12345678abc user_2abcdefghijk data:image/png;base64,iVBORw0KGgo='
      )
    ).toBe('[email] Bearer [token] [token] [token] [token] data:[redacted]')
  })
})

describe('scrubBreadcrumb', () => {
  it('drops breadcrumbs for data URLs', () => {
    expect(scrubBreadcrumb({ category: 'fetch', data: { url: 'data:image/png;base64,AAAA' } })).toBeNull()
  })

  it('strips query strings from request URLs', () => {
    expect(scrubBreadcrumb({ category: 'fetch', data: { url: '/api/x?session_id=cs_1#y', method: 'GET' } })).toEqual({
      category: 'fetch',
      data: { url: '/api/x', method: 'GET' },
    })
  })
})

describe('scrubEvent', () => {
  it('keeps the error and path but drops the user, cookies, headers, body, extras and query string', () => {
    const event: ErrorEvent = {
      type: undefined,
      user: { id: 'u1', email: 'a@b.co' },
      extra: { userId: 'user_2abcdefghijk' },
      request: {
        method: 'POST',
        url: 'https://prophetchrome.com/api/agent/chat?token=x',
        cookies: { __session: 'jwt' },
        headers: { cookie: 'x', 'user-agent': 'ua' },
        data: { messages: ['hi'] },
        query_string: 'token=x',
      },
      exception: { values: [{ type: 'Error', value: 'failed for a@b.co' }] },
    }

    expect(scrubEvent(event)).toEqual({
      type: undefined,
      user: { ip_address: null },
      extra: undefined,
      request: { method: 'POST', url: 'https://prophetchrome.com/api/agent/chat' },
      exception: { values: [{ type: 'Error', value: 'failed for [email]' }] },
    })
  })
})

describe('reportErrorLog', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('sends the logged Error with the log message and without the other fields', () => {
    const error = new Error('connection refused')

    reportErrorLog([{ error, userId: 'user_1' }, 'Failed to fetch chats'])

    expect(sentry.captureException).toHaveBeenCalledWith(error, {
      tags: { source: 'logger' },
      contexts: { log: { message: 'Failed to fetch chats' } },
    })
  })

  it('sends a string error with the log message', () => {
    reportErrorLog([{ error: 'timeout', userId: 'user_1' }, 'Failed to create chat'])

    expect(sentry.captureMessage).toHaveBeenCalledWith('Failed to create chat: timeout', {
      level: 'error',
      tags: { source: 'logger' },
    })
  })

  it('sends a bare message', () => {
    reportErrorLog(['Worker cannot start'])

    expect(sentry.captureMessage).toHaveBeenCalledWith('Worker cannot start', { level: 'error', tags: { source: 'logger' } })
  })
})
