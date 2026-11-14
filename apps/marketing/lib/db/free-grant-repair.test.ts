import { describe, it, expect } from 'vitest'
import path from 'path'
import { readFileSync, readdirSync } from 'fs'
import { eq, sql } from 'drizzle-orm'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@/lib/db/schema'
import { users } from '@/lib/db/schema'
import { TIER_CONFIG } from '@/lib/pricing'

const migrationsFolder = path.resolve(__dirname, 'migrations')
const REPAIR_TAG_SUFFIX = 'repair_free_credits_included'

type Journal = { entries: { idx: number; tag: string }[] }
const journal: Journal = JSON.parse(readFileSync(path.join(migrationsFolder, 'meta/_journal.json'), 'utf8'))
const repairEntry = journal.entries.find(entry => entry.tag.endsWith(REPAIR_TAG_SUFFIX))

const OLD_TIME = new Date('2026-01-01T00:00:00Z')

function userRow(id: string, overrides: Partial<typeof users.$inferInsert> = {}): typeof users.$inferInsert {
  return {
    id,
    email: `${id}@example.com`,
    createdAt: OLD_TIME,
    updatedAt: OLD_TIME,
    ...overrides,
  }
}

// Applies every migration (the repair finds no rows on an empty table), then each test seeds
// users and runs the repair's SQL file again by hand.
async function setup() {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder })
  return db
}

describe('migration: repair Free users created without included Credits', () => {
  it('is in the journal, last and in order', () => {
    expect(repairEntry).toBeDefined()
    expect(repairEntry?.idx).toBe(journal.entries.length - 1)
    expect(journal.entries.map(entry => entry.idx)).toEqual(journal.entries.map((_, index) => index))
    const sqlFiles = readdirSync(migrationsFolder).filter(name => name.endsWith('.sql'))
    expect(sqlFiles).toHaveLength(journal.entries.length)
  })

  const repairSql = (): string => {
    if (!repairEntry) throw new Error('repair migration missing')
    return readFileSync(path.join(migrationsFolder, `${repairEntry.tag}.sql`), 'utf8')
  }

  async function runRepair(db: Awaited<ReturnType<typeof setup>>): Promise<void> {
    for (const statement of repairSql().split('--> statement-breakpoint')) {
      await db.execute(sql.raw(statement))
    }
  }

  async function seedUsers(db: Awaited<ReturnType<typeof setup>>): Promise<void> {
    await db.insert(users).values([
      // Created by the Clerk webhook before the fix: Free, 7 balance, 0 included.
      userRow('webhook_free', { tier: 'free', creditsRemaining: 7, creditsIncluded: 0 }),
      // Same, but the user has spent some of the grant and has Purchased credits.
      userRow('webhook_free_spent', { tier: 'free', creditsRemaining: -3, creditsIncluded: 0, purchasedCredits: 40 }),
      // Created by sign-in sync: already has the grant.
      userRow('signin_free', { tier: 'free', creditsRemaining: 7, creditsIncluded: TIER_CONFIG.free.credits }),
      // Paid user.
      userRow('paid_pro', {
        tier: 'pro',
        creditsRemaining: 900,
        creditsIncluded: TIER_CONFIG.pro.credits,
        stripeCustomerId: 'cus_1',
        stripeSubscriptionId: 'sub_1',
        stripePriceId: 'price_1',
        subscriptionStatus: 'active',
      }),
      // Downgraded to Free by the Stripe webhook: included Credits set to the Free grant.
      userRow('downgraded_free', {
        tier: 'free',
        creditsRemaining: 2,
        creditsIncluded: TIER_CONFIG.free.credits,
        stripeCustomerId: 'cus_2',
      }),
    ])
  }

  async function snapshot(db: Awaited<ReturnType<typeof setup>>) {
    return db.select().from(users).orderBy(users.id)
  }

  it('sets included Credits to the Free grant for Free users with 0, and changes nothing else', async () => {
    const db = await setup()
    await seedUsers(db)
    const before = await snapshot(db)

    await runRepair(db)
    const after = await snapshot(db)

    const byId = (rows: typeof before, id: string) => {
      const row = rows.find(r => r.id === id)
      if (!row) throw new Error(`missing ${id}`)
      return row
    }

    for (const id of ['webhook_free', 'webhook_free_spent']) {
      const { creditsIncluded, ...restAfter } = byId(after, id)
      const { creditsIncluded: wasIncluded, ...restBefore } = byId(before, id)
      expect(wasIncluded).toBe(0)
      expect(creditsIncluded).toBe(TIER_CONFIG.free.credits)
      // Balances, tier, Stripe fields and timestamps are all untouched.
      expect(restAfter).toEqual(restBefore)
    }

    for (const id of ['signin_free', 'paid_pro', 'downgraded_free']) {
      expect(byId(after, id)).toEqual(byId(before, id))
    }
  })

  it('does not touch a paid user whose included Credits is 0', async () => {
    const db = await setup()
    await db.insert(users).values(userRow('odd_paid', { tier: 'pro', creditsIncluded: 0, creditsRemaining: 5 }))
    const before = await snapshot(db)
    await runRepair(db)
    expect(await snapshot(db)).toEqual(before)
  })

  it('changes no row when it runs a second time', async () => {
    const db = await setup()
    await seedUsers(db)
    await runRepair(db)
    const afterFirst = await snapshot(db)
    await runRepair(db)
    expect(await snapshot(db)).toEqual(afterFirst)
    const [row] = await db.select().from(users).where(eq(users.id, 'webhook_free'))
    expect(row.creditsIncluded).toBe(TIER_CONFIG.free.credits)
  })
})
