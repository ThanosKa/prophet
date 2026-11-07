import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

export type RequestClient = {
  db: Database
  close: () => Promise<void>
}

export type DatabaseEnv = {
  DATABASE_URL?: string
  HYPERDRIVE?: { connectionString: string }
}

/**
 * Where a Worker request connects. Binding Hyperdrive in `cloudflare.config.ts` is the
 * only change that moves the Worker onto it.
 */
export function databaseConnectionString(env: DatabaseEnv): string {
  const connectionString = env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL environment variable is not set')
  return connectionString
}

/** Opens one request's client. It connects on its first query, so a request with none costs nothing. */
export function openRequestClient(connectionString: string): RequestClient {
  const client = postgres(connectionString, {
    prepare: false, // Same as the shared pool, for connection poolers.
    max: 1, // One request, one connection: the most a burst can open is one per live request.
    fetch_types: false, // Saves a round trip per connection. The schema has no array columns.
  })
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  }
}
