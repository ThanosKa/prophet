// Conversion numbers for the SEO autopilot report (seo/AUTOPILOT.md): sign-ups, activation
// and paid conversions from the production database and Stripe.
//
//   cd apps/marketing && node --env-file=.env.local scripts/seo-conversions.mjs
//
// Read-only by construction: the SQL runs inside a READ ONLY transaction and Stripe is only
// listed. It prints aggregate counts and never an email, name or user id.
//
// Hours with more than BURST_PER_HOUR sign-ups are reported separately and left out of the
// weekly baseline: a burst like that is not search traffic.
//
// The output contains business numbers. This repo is public: never commit it, paste it into a
// PR, or write it into seo/.

import postgres from 'postgres'
import Stripe from 'stripe'

const BURST_PER_HOUR = 20
const DAY = 86_400

const { DATABASE_URL, STRIPE_SECRET_KEY } = process.env
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

async function databaseNumbers() {
  const sql = postgres(DATABASE_URL, { max: 1, prepare: false })
  try {
    return await sql.begin('read only', async (tx) => {
      const bursts = await tx`
        select to_char(date_trunc('hour', created_at), 'YYYY-MM-DD HH24:00') as hour, count(*)::int as signups
        from users where created_at > now() - interval '12 weeks'
        group by 1 having count(*) > ${BURST_PER_HOUR} order by 1`
      const weekly = await tx`
        with hourly as (
          select date_trunc('hour', created_at) as h, count(*) as n
          from users where created_at > now() - interval '12 weeks' group by 1
        )
        select to_char(date_trunc('week', u.created_at), 'YYYY-MM-DD') as week,
               count(*)::int as signups,
               count(*) filter (where exists (select 1 from usage_records r where r.user_id = u.id))::int as activated,
               count(*) filter (where u.tier <> 'free')::int as paid_now
        from users u join hourly on hourly.h = date_trunc('hour', u.created_at)
        where hourly.n <= ${BURST_PER_HOUR}
        group by 1 order by 1`
      const [totals] = await tx`
        select count(*)::int as users,
               count(*) filter (where tier <> 'free' and subscription_status = 'active')::int as active_paid
        from users`
      const [purchases28] = await tx`
        select count(*)::int as purchases, coalesce(sum(credits), 0)::int as credits
        from credit_purchases where created_at > now() - interval '28 days'`
      return { totals, weekly, bursts, purchases28 }
    })
  } finally {
    await sql.end()
  }
}

async function stripeNumbers() {
  if (!STRIPE_SECRET_KEY) return { skipped: 'STRIPE_SECRET_KEY is not set' }
  const stripe = new Stripe(STRIPE_SECRET_KEY)
  const now = Math.floor(Date.now() / 1000)

  const window = async (gte, lt) => {
    let charges = 0
    let grossCents = 0
    let refundedCents = 0
    for await (const charge of stripe.charges.list({ created: { gte, lt }, limit: 100 })) {
      if (charge.status !== 'succeeded') continue
      charges += 1
      grossCents += charge.amount
      refundedCents += charge.amount_refunded
    }
    return { charges, gross_usd: grossCents / 100, refunded_usd: refundedCents / 100 }
  }

  let activeSubscriptions = 0
  let mrrCents = 0
  for await (const subscription of stripe.subscriptions.list({ status: 'active', limit: 100 })) {
    activeSubscriptions += 1
    for (const item of subscription.items.data) {
      const perYear = item.price.recurring?.interval === 'year'
      mrrCents += ((item.price.unit_amount ?? 0) * (item.quantity ?? 1)) / (perYear ? 12 : 1)
    }
  }

  return {
    last7: await window(now - 7 * DAY, now),
    last28: await window(now - 28 * DAY, now),
    prev28: await window(now - 56 * DAY, now - 28 * DAY),
    active_subscriptions: activeSubscriptions,
    mrr_usd: Math.round(mrrCents) / 100,
  }
}

const result = {
  generated_at: new Date().toISOString(),
  database: await databaseNumbers(),
  stripe: await stripeNumbers(),
}
console.log(JSON.stringify(result, null, 2))
