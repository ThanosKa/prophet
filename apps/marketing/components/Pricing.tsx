'use client'

import { Button } from '@/components/ui/button'
import { SignInButton } from '@clerk/nextjs'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

const plans = [
  {
    name: 'Free',
    price: '$0',
    credits: '$0.50 in API credits',
    features: ['Basic support', 'Limited requests', 'Chat history'],
  },
  {
    name: 'Pro',
    price: '$9.99',
    credits: '$11 in API credits (+10% bonus)',
    features: ['Priority support', 'Higher rate limits', 'Chat history', 'Token insights'],
  },
  {
    name: 'Premium',
    price: '$29.99',
    credits: '$35 in API credits (+17% bonus)',
    features: ['24/7 support', 'Custom rate limits', 'Chat history', 'Advanced analytics'],
    popular: true,
  },
  {
    name: 'Ultra',
    price: '$59.99',
    credits: '$70 in API credits (+17% bonus)',
    features: ['Dedicated support', 'Unlimited requests', 'Chat history', 'API access'],
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
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
              <SignInButton mode="modal" forceRedirectUrl="/account">
                <Button className="w-full mb-6" variant={plan.popular ? 'default' : 'outline'}>
                  Get Started
                </Button>
              </SignInButton>
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
      </div>
    </section>
  )
}
