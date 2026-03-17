import { Lock, Shield, CreditCard, Eye, Code } from 'lucide-react'

const badges = [
  { icon: Lock, label: 'End-to-end encrypted' },
  { icon: Shield, label: 'Enterprise-grade auth' },
  { icon: CreditCard, label: 'Stripe secure payments' },
  { icon: Eye, label: 'Page data stays local' },
  { icon: Code, label: 'Open source on GitHub' },
]

export function TrustBadges() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {badges.map((badge) => {
          const Icon = badge.icon
          return (
            <div key={badge.label} className="flex items-center gap-2 text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span className="text-sm">{badge.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
