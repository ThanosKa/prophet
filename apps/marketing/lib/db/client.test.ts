import { describe, expect, it } from 'vitest'
import { databaseConnectionString, openRequestClient } from './client'

describe('databaseConnectionString', () => {
  it('uses DATABASE_URL until a Hyperdrive binding exists', () => {
    expect(databaseConnectionString({ DATABASE_URL: 'direct' })).toBe('direct')
  })

  it('prefers Hyperdrive once it is bound', () => {
    expect(
      databaseConnectionString({ DATABASE_URL: 'direct', HYPERDRIVE: { connectionString: 'pooled' } })
    ).toBe('pooled')
  })

  it('names the missing setting, not its value', () => {
    expect(() => databaseConnectionString({})).toThrow('DATABASE_URL')
  })
})

describe('openRequestClient', () => {
  it('closes without connecting when the request ran no query', async () => {
    // CI's placeholder address; the point of the test is that nothing dials it.
    const client = openRequestClient('postgresql://ci:ci@localhost:5432/ci')
    await expect(client.close()).resolves.toBeUndefined()
  })
})
