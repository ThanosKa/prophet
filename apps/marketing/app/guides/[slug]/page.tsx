import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { guides, getGuideBySlug, getAllGuideSlugs } from '@/lib/seo/guides'

const difficultyColor = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) return {}
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  const relatedGuides = guide.relatedSlugs
    .map((s) => guides.find((g) => g.slug === s))
    .filter(Boolean)

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.h1,
    description: guide.description,
    totalTime: `PT${parseInt(guide.estimatedTime)}M`,
    step: guide.steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.title,
      text: step.description,
    })),
  }

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Guides', url: 'https://prophetchrome.com/guides' },
          { name: guide.title, url: `https://prophetchrome.com/guides/${guide.slug}` },
        ])) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/guides" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              &larr; All Guides
            </Link>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${difficultyColor[guide.difficulty]}`}>
                {guide.difficulty}
              </span>
              <span className="text-sm text-muted-foreground">{guide.estimatedTime}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">{guide.h1}</h1>
            <p className="text-lg text-muted-foreground">{guide.description}</p>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Steps</h2>
            <div className="space-y-6">
              {guide.steps.map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12 border rounded-lg p-6 bg-muted/30">
            <h2 className="text-xl font-bold mb-4">Pro Tips</h2>
            <ul className="space-y-3">
              {guide.proTips.map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <span className="text-muted-foreground">{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">Example Prompts</h2>
            <div className="grid gap-3">
              {guide.examplePrompts.map((prompt, i) => (
                <div key={i} className="border rounded-lg px-4 py-3 bg-muted/20">
                  <p className="text-sm font-mono">&ldquo;{prompt}&rdquo;</p>
                </div>
              ))}
            </div>
          </section>

          {relatedGuides.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">Related Guides</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedGuides.map((related) => related && (
                  <Link
                    key={related.slug}
                    href={`/guides/${related.slug}`}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{related.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{related.difficulty} &middot; {related.estimatedTime}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Try This Guide Now</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet and follow along with this guide. Free plan available — no credit card required.
          </p>
          <Button asChild>
            <Link href="https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif">
              Add to Chrome
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
