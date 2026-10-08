import { Header } from '@/components/Header'
import { FAQ } from '@/components/FAQ'
import { Footer } from '@/components/Footer'
import { breadcrumbNode, graphJsonLd } from '@/lib/structured-data'
import { homeFaqs, faqNode } from '@/lib/faqs'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Prophet FAQ: Credits, Privacy, Claude Models & Setup' },
  description:
    'How credits work and when they expire, what happens to your page data, which Claude models you get on free, and how to install in under a minute.',
  alternates: { canonical: '/faq' },
}

const faqJsonLd = graphJsonLd([
  faqNode(homeFaqs),
  breadcrumbNode([
    { name: 'Home', url: 'https://prophetchrome.com' },
    { name: 'FAQ', url: 'https://prophetchrome.com/faq' },
  ]),
])

export default function FAQPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
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
