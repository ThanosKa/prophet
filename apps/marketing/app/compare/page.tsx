import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'
import { comparisons } from '@/lib/seo/comparisons'

export const metadata: Metadata = {
  title: 'Prophet vs Competitors - AI Chrome Extension Comparisons',
  description:
    'Compare Prophet with Sider, Monica AI, Claude in Chrome, MaxAI, Merlin, HARPA AI, and Microsoft Copilot. Side-by-side feature tables, pricing, and honest pros and cons.',
  alternates: { canonical: '/compare' },
}

export default function ComparePage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'Compare', url: 'https://prophetchrome.com/compare' },
            ])
          ),
        }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Prophet vs the Competition
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Honest, side-by-side comparisons so you can pick the right AI
              Chrome extension for your workflow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {comparisons.map((c) => (
              <Link key={c.slug} href={`/compare/${c.slug}`}>
                <Card className="h-full hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <p className="font-semibold mb-1">
                      Prophet vs {c.competitor}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {c.description}
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
          <h2 className="text-2xl font-bold mb-4">Ready to try Prophet?</h2>
          <p className="text-muted-foreground mb-6">
            Install the extension and start using Claude AI in your browser. Free plan available.
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
