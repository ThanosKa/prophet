import { withSentry } from '@sentry/cloudflare'
import handler from 'vinext/server/fetch-handler'
import { databaseConnectionString, openRequestClient, type DatabaseEnv } from '../lib/db/client'
import { serveWithRequestDb, type WaitUntilContext } from '../lib/db/request-scope'
import { ERROR_TRACKING } from '../lib/error-tracking'
import { withEdgeHeaders } from './edge-headers'

const worker = {
  async fetch(request: Request, env: DatabaseEnv, ctx: WaitUntilContext): Promise<Response> {
    const response = await serveWithRequestDb({
      ctx,
      openClient: () => openRequestClient(databaseConnectionString(env)),
      handle: async () => handler.fetch(request, env, ctx),
    })
    return withEdgeHeaders({ request, response })
  },
}

const { enabled, ...errorTrackingOptions } = ERROR_TRACKING

/**
 * Worker entry: vinext serves every request, inside a scope that owns that request's
 * database client. A Worker cannot reuse a connection across requests. With error tracking
 * on, Sentry captures what the request throws and flushes before the Worker ends.
 */
export default enabled ? withSentry(() => errorTrackingOptions, worker) : worker
