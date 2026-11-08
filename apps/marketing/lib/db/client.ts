import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type Database = PostgresJsDatabase<typeof schema>

export type RequestClient = {
  db: Database
  close: () => Promise<void>
}

export type DatabaseEnv = {
  HYPERDRIVE?: { connectionString: string }
}

/**
 * Where a Worker request connects: Hyperdrive only. A Worker that dialled DATABASE_URL
 * itself would send the password and Credit data without TLS, so a missing binding is
 * an error, never a fallback. Node and scripts keep using DATABASE_URL (`./index.ts`).
 */
export function databaseConnectionString(env: DatabaseEnv): string {
  const connectionString = env.HYPERDRIVE?.connectionString
  if (!connectionString) {
    throw new Error('HYPERDRIVE binding is missing: refusing to connect to the database without it')
  }
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
