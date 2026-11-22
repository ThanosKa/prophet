import { AsyncLocalStorage } from 'node:async_hooks'
import type { Database, RequestClient } from './client'

type RequestScope = {
  openClient: () => RequestClient
  client: RequestClient | null
  ended: boolean
  pending: Set<Promise<unknown>>
}

const scopes = new AsyncLocalStorage<RequestScope>()

const STILL_RENDERING = /^text\/(event-stream|html|x-component)\b/

let scopesInUse = false

export type WaitUntilContext = { waitUntil: (promise: Promise<unknown>) => void }

/** True once this process has served a request through a scope, which only a Worker does. */
export function requestScopesInUse(): boolean {
  return scopesInUse
}

export function currentRequestDb(): Database | undefined {
  const scope = scopes.getStore()
  if (!scope) return undefined
  if (scope.ended) throw new Error('Database used after its request ended')
  scope.client ??= scope.openClient()
  return scope.client.db
}

/**
 * Keeps this request's client open until `work` settles, however early the response ends.
 * A Turn needs it: the client can hang up long before its Hold is settled. On a Worker the
 * same promise also keeps the request alive after the hang-up. Outside one it does nothing.
 */
export function keepRequestOpenUntil(work: Promise<unknown>): void {
  scopes.getStore()?.pending.add(work)
}

async function closeWhenIdle(scope: RequestScope): Promise<void> {
  while (scope.pending.size > 0) {
    const batch = [...scope.pending]
    await Promise.allSettled(batch)
    batch.forEach((work) => scope.pending.delete(work))
  }
  scope.ended = true
  await scope.client?.close()
}

export function serveWithRequestDb({
  ctx,
  openClient,
  handle,
}: {
  ctx: WaitUntilContext
  openClient: () => RequestClient
  handle: () => Promise<Response>
}): Promise<Response> {
  scopesInUse = true
  const scope: RequestScope = { openClient, client: null, ended: false, pending: new Set() }
  return scopes.run(scope, () => {
    const served = handle().then((response) => {
      if (!response.body || !STILL_RENDERING.test(response.headers.get('Content-Type') ?? '')) {
        return response
      }
      const { readable, writable } = new TransformStream()
      scope.pending.add(response.body.pipeTo(writable).catch(() => {}))
      return new Response(readable, response)
    })
    scope.pending.add(served)
    ctx.waitUntil(closeWhenIdle(scope))
    return served
  })
}
