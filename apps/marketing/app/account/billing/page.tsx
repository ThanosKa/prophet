'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CheckCircle2, ArrowUpRight, Zap, Loader2 } from "lucide-react"
import Link from "next/link"
import { useUser } from "@/contexts/UserContext"

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

  const handleBuyCredits = async () => {
    setIsBuyingCredits(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_EXTRA_CREDITS,
          mode: 'payment',
        }),
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

      {currentTier === 'free' && (
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between p-4 rounded-lg border border-primary/50 bg-primary/5">
            <div>
              <p className="font-medium">Ready for more?</p>
              <p className="text-sm text-muted-foreground">Upgrade to get more credits and priority support.</p>
            </div>
            <Button asChild size="sm">
              <Link href="/pricing">
                View Plans
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}

      <motion.div className="grid gap-6" variants={containerVariants}>
        <motion.div variants={itemVariants}>
          <Card className="border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>
                    You are currently on the <span className="font-semibold text-foreground uppercase">{currentTier}</span> plan.
                  </CardDescription>
                </div>
                <Badge variant={status === 'active' ? 'default' : 'secondary'} className="uppercase">
                  {status === 'active' ? 'Active' : status === 'none' ? 'Free' : status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Monthly Balance</div>
                <motion.div
                  className="text-2xl font-bold"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  ${(user.creditsIncluded / 100).toFixed(2)}
                </motion.div>
              </div>
              {status === 'active' && user.billingPeriodEnd && (
                <motion.div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.2 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Your plan renews on {new Date(user.billingPeriodEnd).toLocaleDateString()}
                </motion.div>
              )}
              {isCanceled && user.billingPeriodEnd && (
                <motion.div
                  className="bg-destructive/10 p-3 rounded-md text-sm text-destructive"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.2 }}
                >
                  Your subscription has been canceled but remains active until {new Date(user.billingPeriodEnd).toLocaleDateString()}.
                </motion.div>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/50 px-6 py-4">
              <form action="/api/stripe/portal" method="POST" className="w-full">
                <Button
                  type="submit"
                  variant="outline"
                  className="w-full"
                  disabled={!user.stripeCustomerId}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Subscription & Payment
                </Button>
              </form>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Buy Extra Credits */}
        <motion.div variants={itemVariants}>
          <Card className="border">
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
