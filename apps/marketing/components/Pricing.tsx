'use client'

import { Button } from '@/components/ui/button'
import { SignInButton, SignedIn, SignedOut } from '@clerk/nextjs'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { Check, Zap } from 'lucide-react'
import { UpgradeButton } from './UpgradeButton'
import { BuyCreditsButton } from './BuyCreditsButton'
import { TIER_CONFIG, type TierName } from '@/lib/pricing'

const plans: Array<{
  name: string
  tier: TierName
  price: string
  credits: string
  features: string[]
  popular?: boolean
}> = [
  {
    name: 'Free',
    tier: 'free',
    price: '$0',
    credits: '$0.50 in API credits',
    features: ['Perfect for occasional use', 'All Claude models included', 'Full browser automation', 'Community support'],
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$9.99',
    credits: '$11 in API credits (+10% bonus)',
    features: ['Best for daily tasks', 'All Claude models included', 'Save 10% on credits', 'Priority email support'],
  },
  {
    name: 'Premium',
    tier: 'premium',
    price: '$29.99',
    credits: '$35 in API credits (+17% bonus)',
    features: ['Best for power users', 'All Claude models included', 'Save 17% on credits', 'Priority support', 'Early feature access'],
    popular: true,
  },
  {
    name: 'Ultra',
    tier: 'ultra',
    price: '$59.99',
    credits: '$70 in API credits (+17% bonus)',
    features: ['Best for heavy usage', 'All Claude models included', 'Save 17% on credits', 'Priority support', 'Early feature access'],
  },
]

interface PricingProps {
  showHeader?: boolean
}

export function Pricing({ showHeader = true }: PricingProps) {
  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {showHeader && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pricing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your needs. Pay only for what you use.
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-6 rounded-lg border relative ${
                plan.popular ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'bg-card'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  MOST POPULAR
                </Badge>
              )}
              <h3 className="text-2xl font-bold mb-2 mt-2">{plan.name}</h3>
              <p className="text-3xl font-bold mb-2">{plan.price}</p>
              <p className="text-sm text-muted-foreground mb-6">{plan.credits}</p>
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/account">
                  <Button className="w-full mb-6" variant={plan.popular ? 'default' : 'outline'}>
                    Get Started
                  </Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                {plan.tier === 'free' ? (
                  <Button className="w-full mb-6" variant="outline" disabled>
                    Free Tier
                  </Button>
                ) : (
                  <UpgradeButton
                    tier={plan.tier}
                    priceId={TIER_CONFIG[plan.tier].priceId}
                    variant={plan.popular ? 'default' : 'outline'}
                    className="w-full mb-6"
                  >
                    Upgrade
                  </UpgradeButton>
                )}
              </SignedIn>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Extra Credits - One-time purchase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 p-6 rounded-lg border bg-card max-w-2xl mx-auto text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="text-xl font-bold">Need a one-time top-up?</h3>
          </div>
          <p className="text-muted-foreground mb-4">
            Buy <span className="font-semibold text-foreground">$10 in credits</span> anytime without a subscription.
            Perfect for occasional use or when you need extra credits before your next billing cycle.
          </p>
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/account/billing">
              <Button variant="outline" size="lg">
                Buy Extra Credits - $10
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <BuyCreditsButton>
              Buy Extra Credits - $10
            </BuyCreditsButton>
          </SignedIn>
        </motion.div>
      </div>
    </section>
  )
}
