import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Model Comparison Table',
  description: 'Compare Claude, GPT, and Gemini AI models side-by-side. See pricing, context windows, speed, and best use cases for every major model.',
  alternates: { canonical: '/tools/ai-model-comparison' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
