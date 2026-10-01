import { Header } from '@/components/Header'
import { Pricing } from '@/components/Pricing'
import { Footer } from '@/components/Footer'
import { breadcrumbNode, graphJsonLd, softwareApplicationNode } from '@/lib/structured-data'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Prophet Pricing: Free $0.20 Credits, Plans from $9.99' },
  description:
    'Pay only for the Claude tokens you use. Free tier with all 3 models and no card. Pro is $9.99/mo for $11 in credits. Cancel anytime.',
  alternates: { canonical: '/pricing' },
}

const pricingJsonLd = graphJsonLd([
  softwareApplicationNode,
  breadcrumbNode([
    { name: 'Home', url: 'https://prophetchrome.com' },
    { name: 'Pricing', url: 'https://prophetchrome.com/pricing' },
  ]),
])

export default function PricingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      <Header />
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple pricing</h1>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your needs
          </p>
          <p className="text-xs text-muted-foreground mt-2">Last updated: March 2026</p>
        </div>
        <Pricing showHeader={false} />
      </div>
      <section className="py-16 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">How Credits Work</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Prophet uses a simple credit system where 1 credit equals approximately 1 cent of AI API cost. When you send a message, tokens are consumed based on the length of your input and the AI response. Different Claude models have different per-token rates — Haiku is the most affordable for quick tasks, while Opus delivers the deepest reasoning for complex work.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            We apply a 20% platform fee on top of Anthropic&apos;s standard API pricing. This covers hosting, authentication, streaming infrastructure, and support. For most users, this is significantly cheaper than a flat $20/month Claude Pro subscription — especially if you use AI occasionally rather than all day. Curious about the free options?{' '}
            <Link href="/blog/is-claude-ai-free" className="text-primary hover:underline">
              See every way to use Claude AI for free
            </Link>{' '}
            or{' '}
            <Link href="/blog/use-claude-without-subscription" className="text-primary hover:underline">
              use Claude without a subscription
            </Link>.
          </p>

          <h2 className="text-2xl font-bold mb-4">All Plans Include</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
            <li>Access to Claude Haiku 4.5, Sonnet 5.5, and Opus 5.5</li>
            <li>18 browser automation tools via Chrome DevTools Protocol</li>
            <li>Real-time streaming responses</li>
            <li>Persistent chat history</li>
            <li>Secure authentication and encrypted data</li>
            <li>Cancel anytime — no contracts</li>
          </ul>
        </div>
      </section>
      <Footer />
    </main>
  )
}
