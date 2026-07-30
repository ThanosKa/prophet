import type { Metadata } from 'next'
import { breadcrumbNode, graphJsonLd, webToolNode } from '@/lib/structured-data'

export const metadata: Metadata = {
  title: { absolute: 'AI Model Comparison Table: Claude vs GPT vs Gemini' },
  description:
    'Every major Claude, GPT and Gemini model side by side: input and output price, context window, speed, and what each is actually good at.',
  alternates: { canonical: '/tools/ai-model-comparison' },
}

const jsonLd = graphJsonLd([
  webToolNode({
    name: 'AI Model Comparison Table',
    description:
      'Sortable table of every major Claude, GPT and Gemini model with pricing, context window, speed and best use case.',
    path: '/tools/ai-model-comparison',
  }),
  breadcrumbNode([
    { name: 'Home', url: 'https://prophetchrome.com' },
    { name: 'Tools', url: 'https://prophetchrome.com/tools' },
    { name: 'AI Model Comparison', url: 'https://prophetchrome.com/tools/ai-model-comparison' },
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
