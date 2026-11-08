import { describe, expect, it } from 'vitest'
import { databaseConnectionString, openRequestClient, type DatabaseEnv } from './client'

describe('databaseConnectionString', () => {
  it('connects through the Hyperdrive binding', () => {
    expect(databaseConnectionString({ HYPERDRIVE: { connectionString: 'via-hyperdrive' } })).toBe(
      'via-hyperdrive'
    )
  })

  it('refuses to connect without the Hyperdrive binding, even when DATABASE_URL is set', () => {
    // A direct DATABASE_URL from a Worker would go out without TLS.
    // The Worker's env holds other names too; a leftover DATABASE_URL secret must not be used.
    const env: DatabaseEnv & { DATABASE_URL: string } = {
      DATABASE_URL: 'postgresql://user:password@db.example.com:5432/postgres',
    }
    expect(() => databaseConnectionString(env)).toThrow('HYPERDRIVE')
  })
})

describe('openRequestClient', () => {
  it('closes without connecting when the request ran no query', async () => {
    // CI's placeholder address; the point of the test is that nothing dials it.
    const client = openRequestClient('postgresql://ci:ci@localhost:5432/ci')
    await expect(client.close()).resolves.toBeUndefined()
  })
})
