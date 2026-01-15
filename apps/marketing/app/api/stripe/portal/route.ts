import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    const url_ = new URL(request.url)
    const appUrl = `${url_.protocol}//${url_.host}`

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/account/billing`,
    })

    logger.info({ userId, customerId: user.stripeCustomerId }, 'Portal session created')

    return NextResponse.redirect(session.url, { status: 303 })
  } catch (error) {
    logger.error({ error }, 'Failed to create portal session')
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
