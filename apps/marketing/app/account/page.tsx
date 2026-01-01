import { ensureDbUser } from "@/lib/db/user"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BarChart3, CreditCard, ExternalLink, Zap } from "lucide-react"

export default async function AccountOverviewPage() {
  const user = await ensureDbUser()

  if (!user) {
    return null
  }

  const creditsRemaining = (user.creditsRemaining / 100).toFixed(2)
  const tierName = user.tier.charAt(0).toUpperCase() + user.tier.slice(1)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Welcome back, {user.firstName || 'User'}</h2>
        <p className="text-muted-foreground">
          Manage your account, view your usage, and configure your subscription.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Remaining</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${creditsRemaining}</div>
            <p className="text-xs text-muted-foreground">
              {user.creditsIncluded > 0 ? `${((user.creditsRemaining / user.creditsIncluded) * 100).toFixed(0)}% of monthly limit` : 'No limit set'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Tier</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tierName}</div>
            <p className="text-xs text-muted-foreground">
              {user.subscriptionStatus === 'active' ? 'Active subscription' : 'Free plan'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage History</CardTitle>
            <CardDescription>
              View your recent AI usage and token consumption.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/account/usage">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Detailed Usage
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>
              Manage your billing, invoices and subscription plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/account/billing">
                <CreditCard className="mr-2 h-4 w-4" />
                Manage Billing
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chrome Extension</CardTitle>
          <CardDescription>
            Make sure you have the latest version of the Prophet extension installed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" className="w-full" asChild>
            <a href="#" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Chrome Web Store
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

