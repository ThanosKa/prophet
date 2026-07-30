import type { Metadata } from 'next'
import { breadcrumbNode, graphJsonLd, webToolNode } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: { absolute: 'Claude API Cost Calculator: Price Any Model in 2026' },
  description:
    'Enter your monthly messages and see the real cost across Claude Haiku, Sonnet, Opus, GPT-4o and Gemini. Live token maths, no signup.',
  alternates: { canonical: '/tools/ai-api-cost-calculator' },
}

const jsonLd = graphJsonLd([
  webToolNode({
    name: 'AI API Cost Calculator',
    description:
      'Calculates the exact per-message and monthly cost of the Claude, GPT and Gemini APIs from your own token volumes.',
    path: '/tools/ai-api-cost-calculator',
  }),
  breadcrumbNode([
    { name: 'Home', url: 'https://prophetchrome.com' },
    { name: 'Tools', url: 'https://prophetchrome.com/tools' },
    { name: 'AI API Cost Calculator', url: 'https://prophetchrome.com/tools/ai-api-cost-calculator' },
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
