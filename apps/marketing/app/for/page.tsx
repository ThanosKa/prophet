import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { professions } from '@/lib/seo/professions'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prophet for Your Profession',
  description:
    'Discover how Prophet AI Chrome extension helps developers, students, marketers, writers, researchers, designers, and more work faster with Claude AI in the browser.',
  alternates: { canonical: '/for' },
}

const modelLabels: Record<string, string> = {
  haiku: 'Haiku 4.5',
  sonnet: 'Sonnet 4.6',
  opus: 'Opus 4.6',
}

export default function ProfessionsHubPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: 'Home', url: 'https://prophetchrome.com' },
              { name: 'For Your Profession', url: 'https://prophetchrome.com/for' },
            ])
          ),
        }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Prophet for Your Profession
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              No matter what you do, Prophet brings Claude AI into your browser so you can
              work faster, think clearer, and get more done without switching tabs.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {professions.map((profession) => (
              <Link key={profession.slug} href={`/for/${profession.slug}`}>
                <Card className="h-full hover:bg-muted/50 transition-colors">
                  <CardContent className="pt-6">
                    <p className="font-semibold mb-2">{profession.h1.replace('Prophet for ', '')}</p>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {profession.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {modelLabels[profession.recommendedModel]}
                      </span>
                      <span>{profession.typicalSessionCost}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
