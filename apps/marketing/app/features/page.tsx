import { Header } from '@/components/Header'
import { Features } from '@/components/Features'
import { CTASection } from '@/components/CTASection'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Features | Prophet',
  description: 'Explore all the features that make Prophet the best AI assistant Chrome extension for your workflow.',
}

export default function FeaturesPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Everything You Need</h1>
          <p className="text-lg text-muted-foreground">
            Prophet is packed with features designed to enhance your productivity and streamline your workflow.
          </p>
        </div>
        <Features />
      </div>
      <CTASection />
      <Footer />
    </main>
  )
}
