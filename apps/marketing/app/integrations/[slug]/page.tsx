import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { faqPageJsonLd } from '@/lib/faqs'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { integrations, getIntegrationBySlug, getAllIntegrationSlugs } from '@/lib/seo/integrations'
import { CHROME_STORE_URL } from '@/lib/seo/shared'

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

  // Rotate rather than slice(0, 4): a fixed slice put the same four links on all ten
  // pages, leaving the rest of the set with no internal links at all.
  const currentIndex = integrations.findIndex((i) => i.slug === integration.slug)
  const relatedIntegrations = Array.from(
    { length: Math.min(4, integrations.length - 1) },
    (_, offset) => integrations[(currentIndex + offset + 1) % integrations.length]
  )

  const faqItems = [
    {
      question: `Is there an AI Chrome extension for ${integration.platform}?`,
      answer: `Yes. Prophet is a Chrome side panel that works on ${integration.platform} and any other website. It reads the page you are viewing and can act on it using browser automation, so you can ${integration.tasks[0].charAt(0).toLowerCase() + integration.tasks[0].slice(1)} without leaving ${integration.platform}.`,
    },
    {
      question: `How do I use Prophet AI with ${integration.platform}?`,
      answer: `Open ${integration.platform} in Chrome, click the Prophet icon to launch the side panel, and ask Prophet about the page. Prophet reads the ${integration.platform} content directly and can interact with the page on your behalf — no copy-pasting into a separate AI tab.`,
    },
    {
      question: `Does Prophet cost anything to use on ${integration.platform}?`,
      answer: `Prophet has a free tier with $0.20 in credits, enough to try it on ${integration.platform} right away. After that it is pay-per-use: you are billed against your Claude API usage plus a 20% platform margin rather than a flat subscription, starting at $9.99/month for $11 in credits.`,
    },
    {
      question: `Which AI model does Prophet use on ${integration.platform}?`,
      answer: `Prophet runs on Claude. You can pick Haiku 4.5 for fast, low-cost ${integration.platform} tasks, Sonnet 5 for balanced everyday work, or Opus 5 for the most complex reasoning. Switch models any time from the side panel.`,
    },
  ]

  const faqJsonLd = faqPageJsonLd(faqItems)

  const softwareAppJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Prophet',
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome',
    description: integration.description,
    url: `https://prophetchrome.com/integrations/${integration.slug}`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier with $0.20 in credits, then pay-per-use from $9.99/month',
    },
  }

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
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

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqItems.map((item, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-2">{item.question}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-4">
            <h2 className="text-xl font-bold mb-4">Prophet for Other Tools</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedIntegrations.map((related) => (
                <Link
                  key={related.slug}
                  href={`/integrations/${related.slug}`}
                  className="border rounded-lg px-4 py-3 hover:border-primary transition-colors"
                >
                  <p className="font-medium">Prophet AI for {related.platform}</p>
                  <p className="text-sm text-muted-foreground line-clamp-1">{related.keyword}</p>
                </Link>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              See all supported tools on the{' '}
              <Link href="/integrations" className="text-primary hover:underline">integrations page</Link>, or explore Prophet by{' '}
              <Link href="/use-cases" className="text-primary hover:underline">use case</Link> and{' '}
              <Link href="/for" className="text-primary hover:underline">profession</Link>.
            </p>
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
            <Link href={CHROME_STORE_URL}>
              Add to Chrome
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
