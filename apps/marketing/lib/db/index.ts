import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Disable prefetch for connection pooling
const connectionString = process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Create postgres connection
const client = postgres(connectionString, {
  prepare: false, // Disable prepared statements for better compatibility with connection poolers
  max: 10, // Maximum number of connections
})

// Create drizzle instance
export const db = drizzle(client, {
  schema,
  logger: process.env.NODE_ENV === 'development',
})

// Export schema for use in queries
export { schema }
