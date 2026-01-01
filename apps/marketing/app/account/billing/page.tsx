import { ensureDbUser } from "@/lib/db/user"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, CheckCircle2 } from "lucide-react"
import { TIER_CONFIG } from "@/lib/pricing"
import Link from "next/link"

export default async function BillingPage() {
  const user = await ensureDbUser()

  if (!user) {
    return null
  }

  const currentTier = user.tier
  const tierInfo = TIER_CONFIG[currentTier as keyof typeof TIER_CONFIG]
  const status = user.subscriptionStatus || 'none'
  const isCanceled = status === 'canceled'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Billing & Subscription</h2>
        <p className="text-muted-foreground">
          Manage your subscription plan, billing information, and payment methods.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
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
              <div className="text-sm font-medium">Included Monthly Credits</div>
              <div className="text-2xl font-bold">${(user.creditsIncluded / 100).toFixed(2)}</div>
            </div>
            {status === 'active' && user.billingPeriodEnd && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Your plan renews on {new Date(user.billingPeriodEnd).toLocaleDateString()}
              </div>
            )}
            {isCanceled && user.billingPeriodEnd && (
              <div className="bg-destructive/10 p-3 rounded-md text-sm text-destructive">
                Your subscription has been canceled but remains active until {new Date(user.billingPeriodEnd).toLocaleDateString()}.
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4">
            <form action="/api/stripe/portal" method="POST" className="w-full">
              <Button type="submit" variant="outline" className="w-full" disabled={!user.stripeCustomerId}>
                <CreditCard className="mr-2 h-4 w-4" />
                Manage in Stripe Portal
              </Button>
            </form>
          </CardFooter>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Usage Caps</CardTitle>
              <CardDescription>
                How many credits you get each month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Monthly credits:</span>
                  <span className="font-medium">${(tierInfo.credits / 100).toFixed(2)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">Bonus included:</span>
                  <span className="font-medium">{tierInfo.bonus}%</span>
                </li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                The card used for your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-md border p-2">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Manage via Stripe</p>
                <p className="text-xs text-muted-foreground">Update your card in the portal above.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {currentTier === 'free' && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle>Ready for more?</CardTitle>
              <CardDescription>
                Upgrade to a paid plan to get more credits and priority access to faster models.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/pricing">View Plans & Upgrade</Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  )
}

