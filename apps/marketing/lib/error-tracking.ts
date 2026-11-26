import { captureException, captureMessage, type Breadcrumb, type ErrorEvent, type Options } from '@sentry/core'
import { z } from 'zod'

export const ERROR_TRACKING_DSN =
  'https://x7t61rwM9GX3uRhwxgu6Tyy6@s2852092.us-west-2a.betterstackdata.com/2852092'

const environmentSchema = z.enum(['production', 'development'])

const REDACTIONS: [RegExp, string][] = [
  [/data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+/g, 'data:[redacted]'],
  [/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]'],
  [/\b(Bearer|Basic)\s+[\w.~+/=-]+/gi, '$1 [token]'],
  [/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]'],
  [/\bsk-ant-[\w-]{8,}/g, '[token]'],
  [/\b(sk|pk|rk|whsec|re|cs|pi|cus|sub|user|sess)_[A-Za-z0-9_]{8,}/g, '[token]'],
]

type ErrorTrackingOptions = Pick<
  Options,
  'dsn' | 'environment' | 'release' | 'tracesSampleRate' | 'dataCollection' | 'beforeBreadcrumb' | 'beforeSend'
>

type ErrorTrackingSettings = { enabled: false } | ({ enabled: true } & ErrorTrackingOptions)

/** Replaces image data URLs, emails, bearer tokens, JWTs, API keys and Clerk/Stripe IDs in a string. */
export function redact(text: string): string {
  return REDACTIONS.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), text)
}

function stripQuery(url: string): string {
  return redact(url.split(/[?#]/, 1)[0] ?? '')
}

/** Drops request breadcrumbs for `data:` URLs and strips query strings and secrets from the rest. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  const url: unknown = breadcrumb.data?.url
  if (typeof url === 'string' && url.startsWith('data:')) return null
  return {
    ...breadcrumb,
    ...(breadcrumb.message !== undefined && { message: redact(breadcrumb.message) }),
    ...(typeof url === 'string' && { data: { ...breadcrumb.data, url: stripQuery(url) } }),
  }
}

/** Keeps only the error, its stack and the request path: no user or IP address, cookies, headers, bodies or query strings. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const { request } = event
  return {
    ...event,
    user: { ip_address: null },
    request: undefined,
    extra: undefined,
    ...(request && {
      request: {
        ...(request.method !== undefined && { method: request.method }),
        ...(request.url !== undefined && { url: stripQuery(request.url) }),
      },
    }),
    ...(event.message !== undefined && { message: redact(event.message) }),
    ...(event.exception?.values && {
      exception: {
        ...event.exception,
        values: event.exception.values.map((value) => ({
          ...value,
          ...(value.value !== undefined && { value: redact(value.value) }),
        })),
      },
    }),
    ...(event.breadcrumbs && {
      breadcrumbs: event.breadcrumbs.flatMap((crumb) => scrubBreadcrumb(crumb) ?? []),
    }),
  }
}

function loggedError(fields: unknown): unknown {
  if (fields instanceof Error) return fields
  if (typeof fields !== 'object' || fields === null) return undefined
  if ('error' in fields) return fields.error
  if ('err' in fields) return fields.err
  return undefined
}

/**
 * Sends an error-level log line (`logger.error({ error }, 'Failed to ...')`) as an event: the logged
 * Error with the message as context, or the message alone. Other fields stay out, since they carry user IDs.
 */
export function reportErrorLog(args: readonly unknown[]): void {
  const [first, second] = args
  const message = typeof first === 'string' ? first : typeof second === 'string' ? second : 'Error logged'
  const error = loggedError(first)
  if (error instanceof Error) {
    captureException(error, { tags: { source: 'logger' }, contexts: { log: { message: redact(message) } } })
    return
  }
  const detail = typeof error === 'string' ? `: ${error}` : ''
  captureMessage(`${message}${detail}`, { level: 'error', tags: { source: 'logger' } })
}

/**
 * Reads the build's error tracking env. Off unless `environment` is "production" or "development".
 * `dataCollection` keeps users, cookies, headers, query strings, bodies, queries and AI inputs out of events.
 */
export function errorTrackingSettings({
  environment,
  release,
}: {
  environment: string | undefined
  release: string | undefined
}): ErrorTrackingSettings {
  const parsed = environmentSchema.safeParse(environment)
  if (!parsed.success) return { enabled: false }
  return {
    enabled: true,
    dsn: ERROR_TRACKING_DSN,
    environment: parsed.data,
    release: release || undefined,
    tracesSampleRate: 0,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: { allow: ['user-agent'] }, response: false },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent,
  }
}

export const ERROR_TRACKING = errorTrackingSettings({
  environment: process.env.NEXT_PUBLIC_ERROR_TRACKING_ENV,
  release: process.env.NEXT_PUBLIC_ERROR_TRACKING_RELEASE,
})
