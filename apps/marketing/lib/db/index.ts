import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import type { Database } from './client'
import { currentRequestDb, requestScopesInUse } from './request-scope'
import * as schema from './schema'

declare global {
  var prophetDbClient: postgres.Sql | undefined
}

let sharedDb: Database | undefined

function getSharedDb(): Database {
  if (sharedDb) return sharedDb

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const client = globalThis.prophetDbClient ?? postgres(connectionString, {
    prepare: false,
    max: process.env.NODE_ENV === 'development' ? 1 : 10,
  })

  if (process.env.NODE_ENV !== 'production') globalThis.prophetDbClient = client

  sharedDb = drizzle(client, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  })
  return sharedDb
}

function resolveDb(): Database {
  const requestDb = currentRequestDb()
  if (requestDb) return requestDb
  if (requestScopesInUse()) throw new Error('Database used outside a request on a Worker')
  return getSharedDb()
}

export const db: Database = new Proxy(Object.create(null), {
  get(_target, property) {
    const target = resolveDb()
    return Reflect.get(target, property, target)
  },
})

export { schema }
