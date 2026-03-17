import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { useCases } from '@/lib/seo/use-cases'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Assistant Use Cases',
  description:
    'Discover how Prophet helps with research, writing, coding, studying, email drafting, content creation, data analysis, and more. AI-powered Chrome extension for every workflow.',
  alternates: { canonical: '/use-cases' },
  keywords: [
    'AI Chrome extension use cases',
    'AI assistant workflows',
    'browser AI automation',
    'Chrome AI productivity',
  ],
}

export default function UseCasesPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'Use Cases', url: 'https://prophetchrome.com/use-cases' },
            ])
          ),
        }}
      />
      <Header />

      <section className="py-20 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            AI Assistant Use Cases
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Prophet works on any webpage. Explore the workflows where an AI
            assistant in your browser side panel makes the biggest difference.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {useCases.map((uc) => (
              <Link key={uc.slug} href={`/use-cases/${uc.slug}`}>
                <Card className="h-full hover:bg-muted/50 transition-colors group">
                  <CardContent className="pt-6">
                    <h2 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {uc.title}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {uc.description}
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

      <Footer />
    </main>
  )
}
