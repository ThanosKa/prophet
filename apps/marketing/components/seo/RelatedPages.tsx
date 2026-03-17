import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface RelatedPagesProps {
  items: Array<{ slug: string; title: string }>
  basePath: string
}

export function RelatedPages({ items, basePath }: RelatedPagesProps) {
  if (items.length === 0) return null

  return (
    <section className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-center">
          Related Pages
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`${basePath}/${item.slug}`}
              className="group flex items-center justify-between p-4 rounded-lg bg-card border transition-colors hover:bg-muted/50"
            >
              <span className="text-sm font-medium">{item.title}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
