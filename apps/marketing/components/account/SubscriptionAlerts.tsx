'use client'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, Clock, XCircle, Info, ArrowUpRight, CreditCard } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface SubscriptionAlertsProps {
  tier: 'free' | 'pro' | 'premium' | 'ultra'
  status: 'active' | 'past_due' | 'incomplete' | 'canceled' | null | undefined
  billingPeriodEnd?: Date | string | null
}

export function SubscriptionAlerts({ tier, status, billingPeriodEnd }: SubscriptionAlertsProps) {
  const isIncomplete = status === 'incomplete'
  const isPastDue = status === 'past_due'
  const isCanceled = status === 'canceled'

  return (
    <>
      {/* Free tier - upgrade prompt */}
      {tier === 'free' && !isIncomplete && !isPastDue && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Ready for more?</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <p>Upgrade to get more credits and priority support.</p>
            <Button asChild size="sm" className="w-fit">
              <Link href="/pricing">
                View Plans
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Past due - payment failed */}
      {isPastDue && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <p>Your last payment failed. Please update your payment method to avoid service interruption.</p>
            <form action="/api/stripe/portal" method="POST" className="w-fit">
              <Button type="submit" size="sm" variant="destructive">
                <CreditCard className="mr-2 h-4 w-4" />
                Update Payment Method
              </Button>
            </form>
          </AlertDescription>
        </Alert>
      )}

      {/* Incomplete - payment pending (amber/gold style) */}
      {isIncomplete && (
        <Alert className="border-amber-500/50 bg-amber-500/5 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
          <Clock className="h-4 w-4" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Payment Pending</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-3">
            <p>Your subscription is pending payment. Please complete the checkout process.</p>
            <form action="/api/stripe/portal" method="POST" className="w-fit">
              <Button type="submit" size="sm" className="bg-amber-500 text-white hover:bg-amber-500/80">
                <CreditCard className="mr-2 h-4 w-4" />
                Complete Checkout
              </Button>
            </form>
          </AlertDescription>
        </Alert>
      )}

      {/* Canceled - access until date */}
      {isCanceled && billingPeriodEnd && (
        <Alert>
          <XCircle className="h-4 w-4" />
          <AlertTitle>Subscription Canceled</AlertTitle>
          <AlertDescription>
            Your subscription remains active until {format(new Date(billingPeriodEnd), "MMMM d, yyyy")}. You&apos;ll be downgraded to Free after.
          </AlertDescription>
        </Alert>
      )}
    </>
  )
}
