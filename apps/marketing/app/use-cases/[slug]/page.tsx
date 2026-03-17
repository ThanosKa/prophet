import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { useCases, getUseCaseBySlug, getRelatedUseCases } from '@/lib/seo/use-cases'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Check, ArrowRight, AlertTriangle, Sparkles, MessageSquare } from 'lucide-react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export function generateStaticParams() {
  return useCases.map((uc) => ({ slug: uc.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const uc = getUseCaseBySlug(slug)
  if (!uc) return {}

  return {
    title: uc.title,
    description: uc.description,
    alternates: { canonical: `/use-cases/${uc.slug}` },
    keywords: [
      uc.keyword,
      'AI Chrome extension',
      'browser AI assistant',
      'Prophet',
    ],
  }
}

export default async function UseCasePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const uc = getUseCaseBySlug(slug)
  if (!uc) notFound()

  const related = getRelatedUseCases(uc.relatedSlugs)

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'Use Cases', url: 'https://prophetchrome.com/use-cases' },
              {
                name: uc.title,
                url: `https://prophetchrome.com/use-cases/${uc.slug}`,
              },
            ])
          ),
        }}
      />
      <Header />

      <section className="py-20 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{uc.h1}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {uc.description}
          </p>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            The Problem
          </h2>
          <div className="space-y-4">
            {uc.painPoints.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                <p className="text-muted-foreground leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            How Prophet Solves It
          </h2>
          <div className="grid gap-4">
            {uc.features.map((feature) => (
              <div key={feature} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-muted-foreground leading-relaxed">
                  {feature}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Example Prompts
          </h2>
          <p className="text-muted-foreground mb-6">
            Try these prompts in Prophet to get started. Open the side panel on
            any relevant webpage and paste one of these into the chat.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {uc.examplePrompts.map((prompt) => (
              <Card key={prompt}>
                <CardContent className="py-4">
                  <p className="text-sm leading-relaxed">&ldquo;{prompt}&rdquo;</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-16 border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-8">Related Use Cases</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/use-cases/${r.slug}`}>
                  <Card className="h-full hover:bg-muted/50 transition-colors group">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                        {r.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {r.description}
                      </p>
                      <span className="text-sm text-primary flex items-center gap-1">
                        Learn more
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">
            Ready to Try Prophet for {uc.title.replace(/^AI\s+/, '').replace(/\s+in Chrome$/, '')}?
          </h2>
          <p className="text-muted-foreground mb-6">
            Install the extension and start using Claude AI in your browser. Free
            plan available — no credit card required.
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
