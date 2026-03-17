import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'
import { industries } from '@/lib/seo/industries'

export const metadata: Metadata = {
  title: 'Industries - AI Browser Assistant for Every Field',
  description: 'See how Prophet AI Chrome extension helps professionals in e-commerce, SaaS, healthcare, legal, finance, education, marketing, and consulting.',
  alternates: { canonical: '/industries' },
}

export default function IndustriesHubPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Industries', url: 'https://prophetchrome.com/industries' },
        ])) }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Prophet AI by Industry</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Prophet adapts to the way you work. See how AI browser assistance fits into your industry with specific workflows, challenges, and use cases.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {industries.map((industry) => (
              <Link
                key={industry.slug}
                href={`/industries/${industry.slug}`}
                className="block border rounded-lg p-6 hover:bg-muted/50 transition-colors"
              >
                <h2 className="text-lg font-semibold mb-2">{industry.title}</h2>
                <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{industry.description}</p>
                <p className="text-xs text-muted-foreground">{industry.workflows.length} workflows &middot; {industry.challenges.length} challenges addressed</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">AI That Fits Your Industry</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet and bring AI assistance to your professional workflow. Free plan available.
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
