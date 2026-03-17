import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Subscription vs Pay-Per-Use: Cost Comparison',
  description: 'Compare monthly costs of ChatGPT Plus, Claude Pro, Gemini Advanced, Perplexity Pro, and Prophet. Find the cheapest AI service for your usage.',
  alternates: { canonical: '/tools/ai-pricing-comparison' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
