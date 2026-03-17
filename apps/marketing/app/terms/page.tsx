import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for Prophet AI Chrome extension. Covers account usage, billing, credits, acceptable use, and subscription policies.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
          </div>

          <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold mb-3">Agreement to Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing and using Prophet, you agree to be bound by these Terms of Service. If you do not agree to
                    these terms, please do not use our service.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Description of Service</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Prophet is a Chrome browser extension that provides AI assistance through integration with Claude AI.
                    The service operates on a usage-based pricing model where you pay for API usage.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Account Registration</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">To use Prophet, you must:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Be at least 13 years of age</li>
                    <li>Provide accurate and complete registration information</li>
                    <li>Maintain the security of your account credentials</li>
                    <li>Accept responsibility for all activities under your account</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Billing</h2>

                  <h3 className="text-lg font-medium mb-2 mt-4">Usage-Based Pricing</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Prophet charges based on actual API usage. Costs are calculated per token used in your AI conversations.
                    Your monthly plan includes a usage balance in dollars.
                  </p>

                  <h3 className="text-lg font-medium mb-2 mt-4">Subscription Plans</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    We offer multiple subscription tiers (Free, Pro, Premium, Ultra). Each plan includes a monthly usage
                    balance. Unused balance does not roll over to the next billing period.
                  </p>

                  <h3 className="text-lg font-medium mb-2 mt-4">Refunds</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Subscription payments are non-refundable. Cancellations take effect at the end of the
                    current billing period.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Acceptable Use</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">You agree not to use Prophet to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Violate any laws or regulations</li>
                    <li>Infringe on intellectual property rights</li>
                    <li>Generate harmful, abusive, or illegal content</li>
                    <li>Attempt to circumvent usage limits or security measures</li>
                    <li>Resell or redistribute the service</li>
                    <li>Reverse engineer the extension</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Service Availability</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We strive to maintain high availability but do not guarantee uninterrupted service. We may suspend or
                    terminate service for maintenance, security issues, or violations of these terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Intellectual Property</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Prophet and its original content, features, and functionality are owned by Prophet and are protected by
                    international copyright, trademark, and other intellectual property laws.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">User Content</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    You retain ownership of content you input into Prophet. By using the service, you grant us permission to
                    process your content through our AI provider (Anthropic) to provide the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Disclaimer of Warranties</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Prophet is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the accuracy,
                    reliability, or completeness of AI-generated content.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    To the maximum extent permitted by law, Prophet shall not be liable for any indirect, incidental,
                    special, or consequential damages arising from your use of the service.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Termination</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We reserve the right to terminate or suspend your account at any time for violations of these terms or
                    for any other reason at our discretion.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Changes to Terms</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may modify these terms at any time. Continued use of Prophet after changes constitutes acceptance of
                    the new terms.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Governing Law</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    These terms shall be governed by and construed in accordance with applicable laws, without regard to
                    conflict of law provisions.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    For questions about these Terms of Service, please contact us at{' '}
                    <a href="mailto:kazakis.th@gmail.com" className="text-foreground underline hover:no-underline">kazakis.th@gmail.com</a>.
                  </p>
                </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
