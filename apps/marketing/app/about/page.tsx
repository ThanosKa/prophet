import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Prophet',
  description: 'Learn about Prophet and our mission to bring AI assistance directly to your browser.',
}

export default function AboutPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">About Prophet</h1>
            <p className="text-sm text-muted-foreground">AI assistance, integrated into your browser</p>
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">What is Prophet?</h2>
              <p className="text-muted-foreground leading-relaxed">
                Prophet is a Chrome browser extension that brings Claude AI directly into your browser&apos;s side panel.
                Access powerful AI assistance without switching tabs, maintaining focus on your work while getting instant help.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Core Features</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Side panel integration for seamless workflow</li>
                <li>Real-time streaming responses powered by Claude AI (Haiku 4.5, Sonnet 4.5, Opus 4.5)</li>
                <li>Usage-based pricing with transparent costs</li>
                <li>Secure authentication and data handling</li>
                <li>Multiple subscription tiers to fit your needs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Our Approach</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Prophet is built on principles that prioritize user experience and trust:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Transparency:</strong> Clear, usage-based pricing with no hidden fees</li>
                <li><strong className="text-foreground">Privacy:</strong> Your conversations are processed but not stored</li>
                <li><strong className="text-foreground">Quality:</strong> Powered by Anthropic&apos;s latest Claude models</li>
                <li><strong className="text-foreground">Accessibility:</strong> Simple interface for advanced AI capabilities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Technology Stack</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Prophet leverages modern technologies to deliver a reliable, secure experience:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Anthropic Claude:</strong> State-of-the-art AI models (choose from Haiku 4.5, Sonnet 4.5, or Opus 4.5)</li>
                <li><strong className="text-foreground">Chrome Extension API:</strong> Native browser integration</li>
                <li><strong className="text-foreground">Clerk:</strong> Enterprise-grade authentication</li>
                <li><strong className="text-foreground">Stripe:</strong> Secure payment processing</li>
                <li><strong className="text-foreground">Real-time Streaming:</strong> Instant response feedback</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Pricing Model</h2>
              <p className="text-muted-foreground leading-relaxed">
                Prophet operates on a usage-based pricing model. You purchase credits that cover actual API costs,
                with subscription tiers offering bonus credits. This ensures you only pay for what you use, with complete
                cost transparency.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Begin using Prophet in three simple steps:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Install the Prophet Chrome extension</li>
                <li>Create an account and choose your plan</li>
                <li>Start chatting with Claude directly from your browser</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Support</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions, feature requests, or technical support, please contact us through our contact form.
                We continuously improve Prophet based on user feedback.
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
