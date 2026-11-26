import { captureException, flush } from '@sentry/core'
import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  captureException(error, {
    tags: {
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
      method: request.method,
    },
  })
  await flush(2000)
}
