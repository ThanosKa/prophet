import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free AI Tools',
  description: 'Free tools to calculate AI API costs, compare AI models side-by-side, and find the cheapest AI subscription for your usage. No sign-up required.',
  alternates: { canonical: '/tools' },
}

const tools = [
  {
    title: 'AI API Cost Calculator',
    description: 'Calculate the exact cost of using Claude, GPT-4o, GPT-4.5, and Gemini APIs based on your token usage. See per-request and monthly cost estimates.',
    href: '/tools/ai-api-cost-calculator',
  },
  {
    title: 'AI Model Comparison Table',
    description: 'Compare Claude, GPT, and Gemini models side-by-side. Sort by price, speed, context window, and best use case.',
    href: '/tools/ai-model-comparison',
  },
  {
    title: 'AI Subscription vs Pay-Per-Use',
    description: 'Find out whether a $20/mo AI subscription or pay-per-use pricing is cheaper for your usage level. Compare ChatGPT Plus, Claude Pro, Prophet, and more.',
    href: '/tools/ai-pricing-comparison',
  },
]

export default function ToolsPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Tools', url: 'https://prophetchrome.com/tools' },
        ])) }}
      />
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Free AI Tools</h1>
            <p className="text-lg text-muted-foreground">
              Calculate costs, compare models, and find the best AI plan for your needs.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-1">
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href} className="block group">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{tool.title}</CardTitle>
                    <CardDescription className="text-sm">{tool.description}</CardDescription>
                  </CardHeader>
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
