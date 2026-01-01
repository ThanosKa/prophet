import { Header } from '@/components/Header'
import { Pricing } from '@/components/Pricing'
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
        <Pricing />
      </div>
      <Footer />
    </main>
  )
}
