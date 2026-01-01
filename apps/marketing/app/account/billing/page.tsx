'use client'

import { motion } from 'framer-motion'
import { ensureDbUser } from "@/lib/db/user"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CheckCircle2 } from "lucide-react"
import { TIER_CONFIG } from "@/lib/pricing"
import Link from "next/link"
import { useEffect, useState } from 'react'
import type { User } from "@prophet/shared"

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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await ensureDbUser()
        setUser(userData)
      } catch (error) {
        console.error("Failed to load user:", error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) {
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
  const tierInfo = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG]
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
          Manage your subscription plan, billing information, and payment methods.
        </p>
      </motion.div>

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
                <div className="text-sm font-medium">Monthly Allowance</div>
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
                  Manage in Stripe Portal
                </Button>
              </form>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div className="grid gap-6 md:grid-cols-2" variants={containerVariants}>
          <motion.div variants={itemVariants}>
            <Card className="border">
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
                <CardDescription>
                  Your monthly API usage allowance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <motion.li
                    className="flex justify-between"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.2 }}
                  >
                    <span className="text-muted-foreground">Monthly allowance:</span>
                    <span className="font-medium">${(tierInfo.credits / 100).toFixed(2)}</span>
                  </motion.li>
                  <motion.li
                    className="flex justify-between"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.2 }}
                  >
                    <span className="text-muted-foreground">Bonus included:</span>
                    <span className="font-medium">{tierInfo.bonus}%</span>
                  </motion.li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border">
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
                <CardDescription>
                  The card used for your subscription.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <motion.div
                  className="rounded-md border p-2"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.2 }}
                >
                  <CreditCard className="h-6 w-6" />
                </motion.div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Manage via Stripe</p>
                  <p className="text-xs text-muted-foreground">Update your card in the portal above.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {currentTier === 'free' && (
          <motion.div variants={itemVariants}>
            <Card className="border-primary bg-primary/5">
              <CardHeader>
                <CardTitle>Ready for more?</CardTitle>
                <CardDescription>
                  Upgrade to a paid plan to get more credits and priority access to faster models.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button
                  asChild
                  className="w-full"
                >
                  <Link href="/pricing">View Plans & Upgrade</Link>
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

