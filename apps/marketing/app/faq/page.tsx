import { Header } from '@/components/Header'
import { FAQ } from '@/components/FAQ'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ - Pricing, Security & Features',
  description: 'Get answers about Prophet, the AI Chrome extension. Learn about pricing, credits, security, supported AI models, installation, and browser automation.',
  alternates: { canonical: '/faq' },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is there a free version?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Prophet includes a free plan with $0.20 in credits — enough for roughly 50 messages with Haiku or 10 with Sonnet. No credit card required.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is Prophet different from ChatGPT or Claude.ai?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Prophet lives inside your browser as a side panel. It can see and interact with the webpage you are on — filling forms, clicking buttons, extracting data, and navigating pages using 18 built-in tools. It is not just a chatbot; it is a browser automation agent powered by Claude AI.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do credits work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your credits are consumed based on the AI tokens used in each conversation. Different Claude models have different per-token costs — Haiku is the most affordable, Opus is the most capable. You can see exact costs in your account dashboard.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use Prophet without a subscription?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The Free plan includes $0.20 in credits to get started. You can also purchase a one-time $10 credit top-up without any subscription. Upgrade anytime for more credits and bonus value.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I install the Chrome extension?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Visit the Chrome Web Store, search for "Prophet", and click "Add to Chrome". After installation, sign in with your account.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens when I run out of balance?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "You'll receive a notification when your balance is low. You can upgrade your plan or purchase additional balance in your account dashboard.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is my data secure?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. All communication is encrypted in transit and at rest. Your browsing data stays on your machine — our servers only process the messages you send to Claude. We use enterprise-grade Clerk authentication and Stripe payment processing.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I cancel my subscription anytime?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Absolutely. You can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.",
      },
    },
    {
      '@type': 'Question',
      name: 'Which AI model does Prophet use?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Prophet supports all Claude models including Claude 4.5 Haiku, Claude 4.6 Sonnet, and Claude 4.6 Opus. You can select any model you prefer at standard Anthropic pricing.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does my balance roll over?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Your balance resets monthly with your subscription. Make sure to use your allocation before the end of each billing period.',
      },
    },
  ],
}

export default function FAQPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'FAQ', url: 'https://prophetchrome.com/faq' },
        ])) }}
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
