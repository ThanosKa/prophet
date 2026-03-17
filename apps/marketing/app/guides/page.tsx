import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import { guides } from '@/lib/seo/guides'

export const metadata: Metadata = {
  title: 'Guides - How to Use AI in Your Browser',
  description: 'Step-by-step guides for using Prophet AI Chrome extension. Learn how to summarize articles, fill forms, write emails, debug code, and automate browser tasks.',
  alternates: { canonical: '/guides' },
}

const difficultyColor = {
  beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export default function GuidesHubPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Guides', url: 'https://prophetchrome.com/guides' },
        ])) }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Prophet AI Guides</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Step-by-step tutorials for getting the most out of Prophet AI in your browser. From beginner basics to advanced automation workflows.
            </p>
          </div>

          <div className="grid gap-6">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guides/${guide.slug}`}
                className="block border rounded-lg p-6 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{guide.title}</h2>
                    <p className="text-muted-foreground text-sm mb-3">{guide.description}</p>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${difficultyColor[guide.difficulty]}`}>
                        {guide.difficulty}
                      </span>
                      <span className="text-xs text-muted-foreground">{guide.estimatedTime}</span>
                      <span className="text-xs text-muted-foreground">{guide.steps.length} steps</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Try These Guides?</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet and start using AI in your browser. Free plan available.
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
