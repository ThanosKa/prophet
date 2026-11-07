import handler from 'vinext/server/fetch-handler'
import { databaseConnectionString, openRequestClient, type DatabaseEnv } from '../lib/db/client'
import { serveWithRequestDb } from '../lib/db/request-scope'

/**
 * Worker entry: vinext serves every request, inside a scope that owns that request's
 * database client. A Worker cannot reuse a connection across requests.
 */
export default {
  fetch(
    request: Request,
    env: DatabaseEnv,
    ctx: { waitUntil: (promise: Promise<unknown>) => void }
  ): Promise<Response> {
    return serveWithRequestDb({
      ctx,
      openClient: () => openRequestClient(databaseConnectionString(env)),
      handle: async () => handler.fetch(request, env, ctx),
    })
  },
}
