import Link from 'next/link'

export interface RelatedLink {
  href: string
  anchor: string
  context: string
}

interface RelatedLinksProps {
  title: string
  intro?: string
  links: RelatedLink[]
}

export function RelatedLinks({ title, intro, links }: RelatedLinksProps) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      {intro && <p className="text-muted-foreground leading-relaxed mb-4">{intro}</p>}
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href} className="text-muted-foreground leading-relaxed">
            <Link href={link.href} className="text-primary font-medium hover:underline">
              {link.anchor}
            </Link>
            {' — '}
            {link.context}
          </li>
        ))}
      </ul>
    </section>
  )
}
