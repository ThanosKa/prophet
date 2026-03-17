import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getIntegrationBySlug, getAllIntegrationSlugs } from '@/lib/seo/integrations'

export async function generateStaticParams() {
  return getAllIntegrationSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const integration = getIntegrationBySlug(slug)
  if (!integration) return {}
  return {
    title: integration.title,
    description: integration.description,
    alternates: { canonical: `/integrations/${integration.slug}` },
  }
}

export default async function IntegrationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const integration = getIntegrationBySlug(slug)
  if (!integration) notFound()

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Integrations', url: 'https://prophetchrome.com/integrations' },
          { name: integration.platform, url: `https://prophetchrome.com/integrations/${integration.slug}` },
        ])) }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/integrations" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              &larr; All Integrations
            </Link>
          </div>

          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">{integration.h1}</h1>
            <p className="text-lg text-muted-foreground">{integration.description}</p>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">What You Can Do</h2>
            <div className="space-y-4">
              {integration.tasks.map((task, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 h-1.5 w-1.5 rounded-full bg-primary mt-2" />
                  <p className="text-muted-foreground">{task}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-xl font-bold mb-4">Example Prompts for {integration.platform}</h2>
            <div className="grid gap-3">
              {integration.examplePrompts.map((prompt, i) => (
                <div key={i} className="border rounded-lg px-4 py-3 bg-muted/20">
                  <p className="text-sm font-mono">&ldquo;{prompt}&rdquo;</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-12 border rounded-lg p-6 bg-muted/30">
            <h2 className="text-xl font-bold mb-3">How It Works</h2>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-bold text-foreground flex-shrink-0">1.</span>
                Open {integration.platform} in Chrome as you normally would.
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-foreground flex-shrink-0">2.</span>
                Click the Prophet icon to open the AI side panel alongside {integration.platform}.
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-foreground flex-shrink-0">3.</span>
                Ask Prophet anything about the page. It reads the content and can interact with the page using browser automation.
              </li>
            </ol>
          </section>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Try Prophet on {integration.platform}</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet, open {integration.platform}, and see AI assistance in action. Free plan available.
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
