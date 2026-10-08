import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js'
import { eq, sql } from 'drizzle-orm'
import postgres from 'postgres'
import { users } from '@/lib/db/schema'
import { reserveCredits, settleCredits } from './credit-reservation'

/**
 * Real SQL semantics for the reserve/settle statements. PGlite always runs; it is a
 * single connection, so it proves the guard holds against interleaved promises.
 * Row-lock re-checks between truly parallel transactions need a real server:
 *   docker run -d --rm --name prophet-optb-pg -e POSTGRES_PASSWORD=test \
 *     -p 127.0.0.1:55432:5432 postgres:16
 *   CREDIT_TEST_PG_URL=postgres://postgres:test@127.0.0.1:55432/postgres pnpm test:run
 * Only loopback URLs are accepted so this can never point at a shared database.
 */
const LOCAL_PG_URL = process.env.CREDIT_TEST_PG_URL
const isLoopback = (url: string) => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)

const USER_ID = 'user_reserve_test'

const CREATE_USERS = sql`
  CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL,
    credits_remaining integer NOT NULL DEFAULT 0,
    purchased_credits integer NOT NULL DEFAULT 0 CHECK (purchased_credits >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`

type Backend = {
  name: string
  connect: () => Promise<{
    db: ReturnType<typeof drizzlePglite> | ReturnType<typeof drizzlePostgres>
    close: () => Promise<void>
  }>
}

const backends: Backend[] = [
  {
    name: 'PGlite (in-process)',
    connect: async () => {
      const client = new PGlite()
      return { db: drizzlePglite(client), close: () => client.close() }
    },
  },
]

if (LOCAL_PG_URL && isLoopback(LOCAL_PG_URL)) {
  backends.push({
    name: 'Postgres (local docker, 20 connections)',
    connect: async () => {
      const client = postgres(LOCAL_PG_URL, { max: 20, onnotice: () => {} })
      return { db: drizzlePostgres(client), close: () => client.end() }
    },
  })
}

describe.each(backends)('credit reservation SQL on $name', ({ connect }) => {
  let connection: Awaited<ReturnType<Backend['connect']>>

  beforeAll(async () => {
    connection = await connect()
    await connection.db.execute(CREATE_USERS)
  })

  afterAll(async () => {
    await connection.db.execute(sql`DROP TABLE IF EXISTS users`)
    await connection.close()
  })

  beforeEach(async () => {
    await connection.db.execute(sql`DELETE FROM users`)
  })

  async function seedBalance(creditsRemaining: number) {
    await connection.db.execute(
      sql`INSERT INTO users (id, email, credits_remaining) VALUES (${USER_ID}, 'bot@example.com', ${creditsRemaining})`
    )
  }

  async function seedBalances({ subscription, purchased }: { subscription: number; purchased: number }) {
    await connection.db.execute(
      sql`INSERT INTO users (id, email, credits_remaining, purchased_credits)
          VALUES (${USER_ID}, 'buyer@example.com', ${subscription}, ${purchased})`
    )
  }

  async function balances(): Promise<{ subscription: number; purchased: number } | undefined> {
    const [row] = await connection.db
      .select({ subscription: users.creditsRemaining, purchased: users.purchasedCredits })
      .from(users)
      .where(eq(users.id, USER_ID))
    return row
  }

  async function balance(): Promise<number | undefined> {
    const [row] = await connection.db
      .select({ creditsRemaining: users.creditsRemaining })
      .from(users)
      .where(eq(users.id, USER_ID))
    return row?.creditsRemaining
  }

  it('lets only 6 of 20 parallel 3-credit reserves through on a 20-credit balance', async () => {
    await seedBalance(20)

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 3 })
      )
    )

    expect(results.filter(Boolean)).toHaveLength(6)
    expect(await balance()).toBe(2)
  })

  it('never takes a free balance below zero, however many requests race', async () => {
    await seedBalance(20)

    const results = await Promise.all(
      Array.from({ length: 60 }, () =>
        reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 1 })
      )
    )

    expect(results.filter(Boolean)).toHaveLength(20)
    expect(await balance()).toBe(0)
  })

  it('refuses a reserve larger than the balance and leaves the balance alone', async () => {
    await seedBalance(20)

    expect(await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 21 })).toBeNull()
    expect(await balance()).toBe(20)
  })

  it('refuses a reserve for a user that does not exist', async () => {
    expect(await reserveCredits({ db: connection.db, userId: 'nobody', reserveCents: 1 })).toBeNull()
  })

  it('settling hands back the unused part of the hold', async () => {
    await seedBalance(20)
    const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 15 })
    if (!hold) throw new Error('expected the hold to be taken')

    await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 4 })

    expect(await balance()).toBe(16)
  })

  it('settling a turn that cost more than its hold charges the difference', async () => {
    await seedBalance(20)
    const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 3 })
    if (!hold) throw new Error('expected the hold to be taken')

    await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 5 })

    expect(await balance()).toBe(15)
  })

  it('parallel reserve-then-settle cycles end at exactly balance minus actual spend', async () => {
    await seedBalance(20)

    const served = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 4 })
        if (hold) {
          await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 1 })
        }
        return hold
      })
    )

    const servedCount = served.filter(Boolean).length
    expect(servedCount).toBeGreaterThanOrEqual(5)
    expect(await balance()).toBe(20 - servedCount)
  })

  describe('with Subscription credits and Purchased credits', () => {
    it('takes the hold from Subscription credits first, then Purchased credits', async () => {
      await seedBalances({ subscription: 3, purchased: 10 })

      const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 5 })

      expect(hold).toEqual({ subscriptionCents: 3, purchasedCents: 2 })
      expect(await balances()).toEqual({ subscription: 0, purchased: 8 })
    })

    it('returns the unused part of a split hold to Purchased credits first', async () => {
      await seedBalances({ subscription: 3, purchased: 10 })
      const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 5 })
      if (!hold) throw new Error('expected the hold to be taken')

      await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 1 })

      expect(await balances()).toEqual({ subscription: 2, purchased: 10 })
    })

    it('charges the overage of a Turn to Subscription credits while they have room', async () => {
      await seedBalances({ subscription: 20, purchased: 10 })
      const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 5 })
      if (!hold) throw new Error('expected the hold to be taken')

      await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 9 })

      expect(await balances()).toEqual({ subscription: 11, purchased: 10 })
    })

    it('charges the overage to Purchased credits once Subscription credits are used up', async () => {
      await seedBalances({ subscription: 3, purchased: 10 })
      const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 5 })
      if (!hold) throw new Error('expected the hold to be taken')

      await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 9 })

      expect(await balances()).toEqual({ subscription: 0, purchased: 4 })
    })

    it('splits an overage across the Subscription credits left, then Purchased credits', async () => {
      await seedBalances({ subscription: 7, purchased: 10 })
      const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 5 })
      if (!hold) throw new Error('expected the hold to be taken')

      await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 10 })

      expect(await balances()).toEqual({ subscription: 0, purchased: 7 })
    })

    it('pushes Subscription credits negative only for the overage both balances cannot cover', async () => {
      await seedBalances({ subscription: 3, purchased: 2 })
      const hold = await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 5 })
      if (!hold) throw new Error('expected the hold to be taken')

      await settleCredits({ db: connection.db, userId: USER_ID, hold, actualCents: 9 })

      expect(await balances()).toEqual({ subscription: -4, purchased: 0 })
    })

    it('refuses a hold the combined balance cannot cover and leaves both balances alone', async () => {
      await seedBalances({ subscription: 3, purchased: 1 })

      expect(await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 5 })).toBeNull()
      expect(await balances()).toEqual({ subscription: 3, purchased: 1 })
    })

    it('counts negative Subscription credits against the combined balance and takes the hold from Purchased credits', async () => {
      await seedBalances({ subscription: -2, purchased: 10 })

      expect(await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 9 })).toBeNull()
      expect(await reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 8 })).toEqual({
        subscriptionCents: 0,
        purchasedCents: 8,
      })
      expect(await balances()).toEqual({ subscription: -2, purchased: 2 })
    })

    it('lets only 6 of 20 parallel 3-credit holds through on 5 Subscription + 15 Purchased credits', async () => {
      await seedBalances({ subscription: 5, purchased: 15 })

      const holds = await Promise.all(
        Array.from({ length: 20 }, () =>
          reserveCredits({ db: connection.db, userId: USER_ID, reserveCents: 3 })
        )
      )

      expect(holds.filter(Boolean)).toHaveLength(6)
      expect(await balances()).toEqual({ subscription: 0, purchased: 2 })
    })
  })
})
