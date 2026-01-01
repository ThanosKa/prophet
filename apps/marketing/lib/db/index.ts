import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Disable prefetch for connection pooling
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

/**
 * Prevents multiple connection pools during Next.js hot reloads in development.
 * Supabase/Postgres has limits on active clients in session mode.
 */
const globalForDb = global as unknown as {
  client: postgres.Sql | undefined
}

const client = globalForDb.client ?? postgres(connectionString, {
  prepare: false, // Disable prepared statements for better compatibility with connection poolers
  max: process.env.NODE_ENV === 'development' ? 1 : 10, // Limit connections in dev
})

if (process.env.NODE_ENV !== 'production') globalForDb.client = client

// Create drizzle instance
export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})

// Export schema for use in queries
export { schema }
