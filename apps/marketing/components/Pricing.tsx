import { Button } from '@/components/ui/button'
import { SignInButton } from '@clerk/nextjs'

export function Pricing() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      credits: '50K tokens/month',
      features: ['Basic support', 'Limited requests', 'Chat history'],
    },
    {
      name: 'Pro',
      price: '$9.99',
      credits: '500K tokens/month',
      features: ['Priority support', 'Higher rate limits', 'Chat history', 'Token insights'],
      popular: true,
    },
    {
      name: 'Premium',
      price: '$29.99',
      credits: '$35 in API credits (+17% bonus)',
      features: ['24/7 support', 'Custom rate limits', 'Chat history', 'Advanced analytics'],
    },
    {
      name: 'Ultra',
      price: '$59.99',
      credits: '$70 in API credits (+17% bonus)',
      features: ['Dedicated support', 'Unlimited requests', 'Chat history', 'API access'],
    },
  ]

  return (
    <section id="pricing" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold mb-12 text-center">Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-6 rounded-lg border ${
                plan.popular ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'bg-card'
              }`}
            >
              {plan.popular && (
                <div className="text-xs font-semibold text-primary mb-2">MOST POPULAR</div>
              )}
              <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
              <p className="text-3xl font-bold mb-2">{plan.price}</p>
              <p className="text-sm text-muted-foreground mb-6">{plan.credits}</p>
              <SignInButton mode="modal">
                <Button className="w-full mb-6" variant={plan.popular ? 'default' : 'outline'}>
                  Get Started
                </Button>
              </SignInButton>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-1">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
