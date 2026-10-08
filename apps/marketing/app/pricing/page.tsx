import { Header } from '@/components/Header'
import { Pricing } from '@/components/Pricing'
import { Footer } from '@/components/Footer'
import { breadcrumbNode, graphJsonLd, softwareApplicationNode } from '@/lib/structured-data'
import Link from 'next/link'
import { TIER_CONFIG, formatCreditsAsDollars } from '@/lib/pricing'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: `Prophet Pricing: Free ${formatCreditsAsDollars(TIER_CONFIG.free.credits)} Credits, Plans from $9.99` },
  description: `Pay only for the Claude tokens you use. Free credits to try Haiku, no card. Pro is $9.99/mo for ${formatCreditsAsDollars(TIER_CONFIG.pro.credits)} in credits. Cancel anytime.`,
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
          <p className="text-xs text-muted-foreground mt-2">Last updated: October 2026</p>
        </div>
        <Pricing showHeader={false} />
      </div>
      <section className="py-16 border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">How Credits Work</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Prophet uses simple pay-per-use credits where 1 credit equals 1 cent. When you send a message, the agent works on it in Turns, one call to Claude each, and every Turn is charged by the tokens it uses, with a minimum of 1 credit per Turn. Different Claude models have different per-token rates — Haiku is the most affordable for quick tasks, while Opus delivers the deepest reasoning for complex work.
          </p>
          <p className="text-muted-foreground leading-relaxed mb-8">
            A plan&apos;s credits equal its price: Pro is $9.99 for {formatCreditsAsDollars(TIER_CONFIG.pro.credits)} in credits every month. Subscription credits renew monthly and don&apos;t roll over. Credits you buy once never expire, and each Turn spends your subscription credits first. New accounts get a one-time {formatCreditsAsDollars(TIER_CONFIG.free.credits)} to try Haiku. For most users, this is significantly cheaper than a flat $20/month Claude Pro subscription — especially if you use AI occasionally rather than all day. Curious about the free options?{' '}
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
            <li>Access to Claude Haiku 5.5, Sonnet 5.5, and Opus 5.5</li>
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
