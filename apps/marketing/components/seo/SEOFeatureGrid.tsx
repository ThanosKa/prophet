import { Check } from 'lucide-react'

interface SEOFeatureGridProps {
  features: string[]
}

export function SEOFeatureGrid({ features }: SEOFeatureGridProps) {
  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 p-4 rounded-lg bg-card border"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
