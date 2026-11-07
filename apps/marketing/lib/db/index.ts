import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { Database } from './client'
import { currentRequestDb, requestScopesInUse } from './request-scope'
import * as schema from './schema'

/**
 * Prevents multiple connection pools during Next.js hot reloads in development.
 * Supabase/Postgres has limits on active clients in session mode.
 */
const globalForDb = global as unknown as {
  client: postgres.Sql | undefined
}

let sharedDb: Database | undefined

/** The pool used under Next.js and by scripts, where a connection may outlive a request. */
function getSharedDb(): Database {
  if (sharedDb) return sharedDb

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = globalForDb.client ?? postgres(connectionString, {
    prepare: false, // Disable prepared statements for better compatibility with connection poolers
    max: process.env.NODE_ENV === 'development' ? 1 : 10, // Limit connections in dev
  })

  if (process.env.NODE_ENV !== 'production') globalForDb.client = client

  sharedDb = drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  })
  return sharedDb
}

function resolveDb(): Database {
  const requestDb = currentRequestDb()
  if (requestDb) return requestDb
  // A Worker's shared pool would fail on the next request, so fail loudly here instead.
  if (requestScopesInUse()) throw new Error('Database used outside a request on a Worker')
  return getSharedDb()
}

/** The database for the current context: this request's client on a Worker, otherwise the pool. */
export const db: Database = new Proxy(Object.create(null), {
  get(_target, property) {
    const target = resolveDb()
    return Reflect.get(target, property, target)
  },
})

// Export schema for use in queries
export { schema }
