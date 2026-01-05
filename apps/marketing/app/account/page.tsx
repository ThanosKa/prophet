"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { BarChart3, CreditCard, ChevronRight, Chrome } from "lucide-react";
import { useUser } from "@/contexts/UserContext";

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

      <Card className="border transition-colors">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Balance</p>
              <p className="text-4xl font-bold">${creditsRemaining}</p>
              {user.creditsIncluded > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
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
              <p className="text-sm text-muted-foreground mb-1">Plan</p>
              <p className="text-4xl font-bold">{tierName}</p>
              <Badge
                variant={
                  user.subscriptionStatus === "active" ? "default" : "secondary"
                }
                className="mt-3"
              >
                {user.subscriptionStatus === "active" ? "Active" : "Free Plan"}
              </Badge>
            </div>
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
