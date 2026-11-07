import { beforeEach, describe, expect, it, vi } from 'vitest'

// Never connects: nothing here runs a query, and this address is CI's placeholder.
const PLACEHOLDER_URL = 'postgresql://ci:ci@localhost:5432/ci'

const noopContext = { waitUntil: () => {} }

describe('db', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('DATABASE_URL', PLACEHOLDER_URL)
  })

  it('reaches the request client inside a Worker request', async () => {
    const { db } = await import('./index')
    const { serveWithRequestDb } = await import('./request-scope')
    const requestDb = Object.assign(Object.create(null), { marker: 'this request' })
    let seen: unknown

    await serveWithRequestDb({
      ctx: noopContext,
      openClient: () => ({ db: requestDb, close: async () => {} }),
      handle: async () => {
        seen = Reflect.get(db, 'marker')
        return new Response(null, { status: 204 })
      },
    })

    expect(seen).toBe('this request')
  })

  it('uses the shared pool under Next.js and in scripts, where no request scope exists', async () => {
    const { db } = await import('./index')
    expect(db.select).toBeTypeOf('function')
  })

  it('refuses the shared pool on a Worker, where a connection cannot outlive its request', async () => {
    const { db } = await import('./index')
    const { serveWithRequestDb } = await import('./request-scope')
    await serveWithRequestDb({
      ctx: noopContext,
      openClient: () => ({ db: Object.create(null), close: async () => {} }),
      handle: async () => new Response(null, { status: 204 }),
    })

    expect(() => db.select).toThrow('outside a request')
  })

  it('reports a missing DATABASE_URL when first used, not when imported', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { db } = await import('./index')
    expect(() => db.select).toThrow('DATABASE_URL')
  })
})
