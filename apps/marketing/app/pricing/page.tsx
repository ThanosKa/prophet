import { Header } from '@/components/Header'
import { Pricing } from '@/components/Pricing'
import { FAQ } from '@/components/FAQ'
import { CTASection } from '@/components/CTASection'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | Prophet',
  description: 'Choose the perfect plan for your AI assistant needs. Pay only for what you use with transparent pricing.',
}

export default function PricingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-lg text-muted-foreground">
            Choose the plan that fits your needs. All plans include full access to Claude Sonnet 4.5.
          </p>
        </div>
        <Pricing />
        <div className="mt-20">
          <FAQ />
        </div>
      </div>
      <CTASection />
      <Footer />
    </main>
  )
}
