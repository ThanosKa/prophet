import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'
import { alternatives } from '@/lib/seo/comparisons'

export const metadata: Metadata = {
  title: 'Best Alternatives to Popular AI Chrome Extensions',
  description:
    'Looking for an alternative to Sider, Monica AI, Claude in Chrome, MaxAI, Merlin, or HARPA AI? Prophet offers pay-per-use pricing, 18 browser automation tools, and open-source transparency.',
  alternates: { canonical: '/alternatives' },
}

export default function AlternativesPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'Alternatives', url: 'https://prophetchrome.com/alternatives' },
            ])
          ),
        }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              AI Chrome Extension Alternatives
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Switching from another AI browser extension? See why users choose
              Prophet for browser automation, transparent pricing, and open-source
              trust.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {alternatives.map((a) => (
              <Link key={a.slug} href={`/alternatives/${a.slug}`}>
                <Card className="h-full hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <p className="font-semibold mb-1">
                      {a.competitor} Alternative
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {a.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Ready to switch?</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet in under a minute. Free plan included -- no credit card
            required.
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
