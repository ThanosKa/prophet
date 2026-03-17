import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import { integrations } from '@/lib/seo/integrations'

export const metadata: Metadata = {
  title: 'Integrations - Use AI on Any Website',
  description: 'Prophet AI works on every website you use. See how to use AI assistance on GitHub, Gmail, Google Docs, Notion, LinkedIn, Reddit, YouTube, Stack Overflow, Jira, and Shopify.',
  alternates: { canonical: '/integrations' },
}

export default function IntegrationsHubPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Integrations', url: 'https://prophetchrome.com/integrations' },
        ])) }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Prophet AI Integrations</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prophet lives in your Chrome side panel and works on every website. Here is how to get the most out of AI on the platforms you already use.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {integrations.map((integration) => (
              <Link
                key={integration.slug}
                href={`/integrations/${integration.slug}`}
                className="block border rounded-lg p-6 hover:bg-muted/50 transition-colors"
              >
                <h2 className="text-lg font-semibold mb-2">{integration.platform}</h2>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{integration.description}</p>
                <p className="text-xs text-muted-foreground">{integration.tasks.length} use cases</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Works Everywhere You Browse</h2>
          <p className="text-muted-foreground mb-6">
            Prophet is not limited to these platforms. It works on any website. Install and try it on your favorite tools.
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
