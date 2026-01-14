"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BarChart3, CreditCard, ChevronRight, Chrome, CheckCircle2, AlertCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useUser } from "@/contexts/UserContext";
import { SubscriptionAlerts } from "@/components/account/SubscriptionAlerts";

export default function AccountOverviewPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const creditsRemaining = (user.creditsRemaining / 100).toFixed(2);
  const tierName = user.tier.charAt(0).toUpperCase() + user.tier.slice(1);
  const creditPercentage =
    user.creditsIncluded > 0
      ? Math.round((user.creditsRemaining / user.creditsIncluded) * 100)
      : 0;

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.firstName || "User"}
        </h2>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your account.
        </p>
      </div>

      {/* Status Alerts - only show problem states on overview (not free tier prompt) */}
      {(user.subscriptionStatus === 'past_due' || user.subscriptionStatus === 'incomplete' || user.subscriptionStatus === 'canceled') && (
        <SubscriptionAlerts
          tier={user.tier}
          status={user.subscriptionStatus}
          billingPeriodEnd={user.billingPeriodEnd}
        />
      )}

      <Card className="border transition-colors">
        <CardContent className="pt-6">
          <div className={`grid grid-cols-1 ${user.subscriptionStatus ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-8`}>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className="text-4xl font-bold">${creditsRemaining}</p>
              {user.creditsIncluded > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(creditPercentage, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {creditPercentage}%
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Tier</p>
              <p className="text-2xl font-bold">{tierName}</p>
            </div>
            {user.subscriptionStatus && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {user.subscriptionStatus === 'active' && (
                  <div className="flex flex-col gap-1.5">
                    <Badge variant="outline" className="w-fit bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Active
                    </Badge>
                    {user.billingPeriodEnd && (
                      <p className="text-xs text-muted-foreground">
                        Renews {format(new Date(user.billingPeriodEnd), "MMMM d, yyyy")}
                      </p>
                    )}
                  </div>
                )}
                {user.subscriptionStatus === 'past_due' && (
                  <Badge variant="destructive" className="w-fit">
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                    Past Due
                  </Badge>
                )}
                {user.subscriptionStatus === 'incomplete' && (
                  <Badge variant="outline" className="w-fit bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Pending
                  </Badge>
                )}
                {user.subscriptionStatus === 'canceled' && (
                  <Badge variant="secondary" className="w-fit">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Canceled
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">
          Quick Actions
        </h3>
        <div className="grid gap-2">
          <Link href="/account/usage" className="group">
            <Card className="border hover:bg-muted/50 transition-colors">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Usage History</p>
                    <p className="text-sm text-muted-foreground">
                      View token consumption and costs
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/account/billing" className="group">
            <Card className="border hover:bg-muted/50 transition-colors">
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Billing & Subscription</p>
                    <p className="text-sm text-muted-foreground">
                      Manage your plan and payment method
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-3">
          <Chrome className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Get the Chrome extension to use Prophet in your browser
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
          >
            Install Extension
          </a>
        </Button>
      </div>
    </motion.div>
  );
}
