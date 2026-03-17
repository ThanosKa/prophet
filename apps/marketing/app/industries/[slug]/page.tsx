import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getIndustryBySlug, getAllIndustrySlugs, industries } from '@/lib/seo/industries'

export async function generateStaticParams() {
  return getAllIndustrySlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const industry = getIndustryBySlug(slug)
  if (!industry) return {}
  return {
    title: industry.title,
    description: industry.description,
    alternates: { canonical: `/industries/${industry.slug}` },
  }
}

export default async function IndustryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const industry = getIndustryBySlug(slug)
  if (!industry) notFound()

  const relatedIndustries = industry.relatedProfessions
    .map((s) => industries.find((ind) => ind.slug === s))
    .filter(Boolean)

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Industries', url: 'https://prophetchrome.com/industries' },
          { name: industry.title, url: `https://prophetchrome.com/industries/${industry.slug}` },
        ])) }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              &larr; All Industries
            </Link>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">{industry.h1}</h1>
            <p className="text-lg text-muted-foreground">{industry.description}</p>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Challenges Prophet Solves</h2>
            <div className="space-y-4">
              {industry.challenges.map((challenge, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">{challenge}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Workflows</h2>
            <div className="space-y-6">
              {industry.workflows.map((workflow, i) => (
                <div key={i} className="border rounded-lg p-6">
                  <h3 className="font-semibold mb-2">{workflow.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{workflow.description}</p>
                </div>
              ))}
            </div>
          </section>

          {industry.relatedUseCases.length > 0 && (
            <section className="mb-12 border rounded-lg p-6 bg-muted/30">
              <h2 className="text-xl font-bold mb-4">Related Guides</h2>
              <div className="flex flex-wrap gap-2">
                {industry.relatedUseCases.map((slug) => (
                  <Link
                    key={slug}
                    href={`/guides/${slug}`}
                    className="text-sm px-3 py-1.5 border rounded-full hover:bg-muted transition-colors"
                  >
                    {slug.replace(/-/g, ' ')}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {relatedIndustries.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl font-bold mb-4">Related Industries</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedIndustries.map((related) => related && (
                  <Link
                    key={related.slug}
                    href={`/industries/${related.slug}`}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{related.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{related.workflows.length} workflows</p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Bring AI to Your Workflow</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet and start using AI in your daily work. Free plan available — no credit card required.
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
