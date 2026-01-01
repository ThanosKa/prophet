import { Header } from '@/components/Header'
import { FAQ } from '@/components/FAQ'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ | Prophet',
  description: 'Frequently asked questions about Prophet, the AI assistant Chrome extension.',
}

export default function FAQPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-muted-foreground">
            Everything you need to know about using Prophet
          </p>
        </div>
        <FAQ showHeader={false} />
      </div>
      <Footer />
    </main>
  )
}
