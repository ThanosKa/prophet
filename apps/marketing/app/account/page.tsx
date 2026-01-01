'use client'

import { motion } from "framer-motion"
import { ensureDbUser } from "@/lib/db/user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BarChart3, CreditCard, ExternalLink, Zap } from "lucide-react"
import { useEffect, useState } from "react"
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

export default function AccountOverviewPage() {
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

  const creditsRemaining = (user.creditsRemaining / 100).toFixed(2)
  const tierName = user.tier.charAt(0).toUpperCase() + user.tier.slice(1)
  const creditPercentage = user.creditsIncluded > 0
    ? ((user.creditsRemaining / user.creditsIncluded) * 100).toFixed(0)
    : 0

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="flex flex-col gap-2" variants={itemVariants}>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.firstName || 'User'}
        </h2>
        <p className="text-muted-foreground">
          Manage your account, view your usage, and configure your subscription.
        </p>
      </motion.div>

      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="border hover:shadow-md transition-all duration-200 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                ${creditsRemaining}
              </motion.div>
              <p className="text-xs text-muted-foreground mt-1">
                {user.creditsIncluded > 0
                  ? `${creditPercentage}% of monthly limit`
                  : 'No limit set'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border hover:shadow-md transition-all duration-200 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Tier</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                {tierName}
              </motion.div>
              <p className="text-xs text-muted-foreground mt-1">
                {user.subscriptionStatus === 'active'
                  ? 'Active subscription'
                  : 'Free plan'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div
        className="grid gap-4 md:grid-cols-2"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Card className="border hover:shadow-md transition-all duration-200 hover:-translate-y-1">
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                View your recent AI usage and token consumption.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                variant="outline"
                className="w-full transition-all duration-200 hover:shadow-md active:scale-95"
              >
                <Link href="/account/usage">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  View Detailed Usage
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border hover:shadow-md transition-all duration-200 hover:-translate-y-1">
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your billing, invoices and subscription plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                asChild
                className="w-full transition-all duration-200 hover:shadow-md active:scale-95"
              >
                <Link href="/account/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Manage Billing
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border hover:shadow-md transition-all duration-200 hover:-translate-y-1">
          <CardHeader>
            <CardTitle>Chrome Extension</CardTitle>
            <CardDescription>
              Make sure you have the latest version of the Prophet extension
              installed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full transition-all duration-200 hover:shadow-md active:scale-95"
              asChild
            >
              <a href="#" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Chrome Web Store
              </a>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

