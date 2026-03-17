import { Badge } from '@/components/ui/badge'

interface SEOHeroProps {
  title: string
  description: string
  badge?: string
}

export function SEOHero({ title, description, badge }: SEOHeroProps) {
  return (
    <section className="py-20 sm:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {badge && (
          <div className="mb-4">
            <Badge variant="secondary">{badge}</Badge>
          </div>
        )}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
          {title}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      </div>
    </section>
  )
}
