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

export function openRequestClient(connectionString: string): RequestClient {
  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
    fetch_types: false,
  })
  return {
    db: drizzle(client, { schema }),
    close: () => client.end({ timeout: 5 }),
  }
}
