import type { Metadata } from 'next'
import { breadcrumbNode, graphJsonLd, webToolNode } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: { absolute: 'AI Subscription vs Pay-Per-Use: Which Costs You Less' },
  description:
    'ChatGPT Plus, Claude Pro, Gemini Advanced and Perplexity Pro priced against your real usage. Find your breakeven point in a few seconds.',
  alternates: { canonical: '/tools/ai-pricing-comparison' },
}

const jsonLd = graphJsonLd([
  webToolNode({
    name: 'AI Subscription vs Pay-Per-Use Calculator',
    description:
      'Compares the monthly cost of ChatGPT Plus, Claude Pro, Gemini Advanced, Perplexity Pro and pay-per-use credits at your own usage level.',
    path: '/tools/ai-pricing-comparison',
  }),
  breadcrumbNode([
    { name: 'Home', url: 'https://prophetchrome.com' },
    { name: 'Tools', url: 'https://prophetchrome.com/tools' },
    { name: 'AI Pricing Comparison', url: 'https://prophetchrome.com/tools/ai-pricing-comparison' },
  ]),
])

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  )
}
