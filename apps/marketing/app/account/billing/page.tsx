'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CheckCircle2, Zap, Loader2, AlertCircle, Clock, XCircle } from "lucide-react"
import { format } from "date-fns"
import { useUser } from "@/contexts/UserContext"
import { SubscriptionAlerts } from "@/components/account/SubscriptionAlerts"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

export default function BillingPage() {
  const { user, isLoading } = useUser()

  const [isBuyingCredits, setIsBuyingCredits] = useState(false)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)

  const handleBuyCredits = async () => {
    setIsBuyingCredits(true)
    try {
      const response = await fetch('/api/stripe/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to start checkout:', error)
    } finally {
      setIsBuyingCredits(false)
    }
  }

  const handleManageSubscription = async () => {
    setIsManagingSubscription(true)
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Failed to open portal:', error)
    } finally {
      setIsManagingSubscription(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentTier = user.tier
  const status = user.subscriptionStatus || 'none'
  const isCanceled = status === 'canceled'
  const isIncomplete = status === 'incomplete'
  const isPastDue = status === 'past_due'

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="flex flex-col gap-2" variants={itemVariants}>
        <h2 className="text-3xl font-bold tracking-tight">Billing & Subscription</h2>
        <p className="text-muted-foreground">
          Manage your subscription and payment method.
        </p>
      </motion.div>

      {/* Status Alerts */}
      <motion.div variants={itemVariants}>
        <SubscriptionAlerts
          tier={currentTier}
          status={user.subscriptionStatus}
          billingPeriodEnd={user.billingPeriodEnd}
        />
      </motion.div>

      <motion.div className="grid gap-6" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <Card className="border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Current Plan</CardTitle>
                {/* Tier Badge */}
                {currentTier === 'free' && (
                  <Badge variant="secondary">Free</Badge>
                )}
                {currentTier === 'pro' && (
                  <Badge variant="default">Pro</Badge>
                )}
                {currentTier === 'premium' && (
                  <Badge variant="default">Premium</Badge>
                )}
                {currentTier === 'ultra' && (
                  <Badge variant="default">Ultra</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Current Balance</div>
                <motion.div
                  className="text-2xl font-bold"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  ${(user.creditsRemaining / 100).toFixed(2)}
                </motion.div>
                {user.creditsIncluded > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {user.creditsRemaining > user.creditsIncluded
                      ? `Includes $${((user.creditsRemaining - user.creditsIncluded) / 100).toFixed(2)} in extra credits`
                      : `$${(user.creditsIncluded / 100).toFixed(2)}/mo included`
                    }
                  </div>
                )}
              </div>
              {status === 'active' && user.billingPeriodEnd && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {user.cancelAtPeriodEnd ? (
                    <>
                      <Clock className="h-4 w-4 text-amber-500" />
                      Cancels {format(new Date(user.billingPeriodEnd), "MMMM d, yyyy")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Renews {format(new Date(user.billingPeriodEnd), "MMMM d, yyyy")}
                    </>
                  )}
                </div>
              )}
              {isPastDue && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Payment failed — update required
                </div>
              )}
              {isIncomplete && (
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <Clock className="h-4 w-4" />
                  Payment pending
                </div>
              )}
              {isCanceled && user.billingPeriodEnd && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <XCircle className="h-4 w-4" />
                  Access until {format(new Date(user.billingPeriodEnd), "MMMM d, yyyy")}
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/50 px-6 py-4">
              <Button
                onClick={handleManageSubscription}
                variant="outline"
                className="w-full"
                disabled={!user.stripeCustomerId || isManagingSubscription}
              >
                {isManagingSubscription ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Subscription & Payment
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Buy Extra Credits */}
        <motion.div variants={itemVariants}>
          <Card className="border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>Extra Credits</CardTitle>
              </div>
              <CardDescription>
                Need more credits? Buy a one-time top-up without changing your plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">$10.00</p>
                  <p className="text-sm text-muted-foreground">$10 in credits added to your balance</p>
                </div>
                <Button
                  onClick={handleBuyCredits}
                  disabled={isBuyingCredits}
                  variant="outline"
                >
                  {isBuyingCredits ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Buy Credits
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
