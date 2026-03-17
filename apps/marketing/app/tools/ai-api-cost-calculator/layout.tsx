import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI API Cost Calculator',
  description: 'Calculate the exact cost of using Claude, GPT-4o, GPT-4.5, and Gemini APIs. Compare raw API costs vs Prophet pricing with monthly estimates.',
  alternates: { canonical: '/tools/ai-api-cost-calculator' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
