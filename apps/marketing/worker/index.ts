import handler from 'vinext/server/fetch-handler'
import { databaseConnectionString, openRequestClient, type DatabaseEnv } from '../lib/db/client'
import { serveWithRequestDb, type WaitUntilContext } from '../lib/db/request-scope'
import { withEdgeHeaders } from './edge-headers'

/**
 * Worker entry: vinext serves every request, inside a scope that owns that request's
 * database client. A Worker cannot reuse a connection across requests.
 */
export default {
  async fetch(request: Request, env: DatabaseEnv, ctx: WaitUntilContext): Promise<Response> {
    const response = await serveWithRequestDb({
      ctx,
      openClient: () => openRequestClient(databaseConnectionString(env)),
      handle: async () => handler.fetch(request, env, ctx),
    })
    return withEdgeHeaders({ request, response })
  },
}
