import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Prophet',
  description: 'Terms of service for Prophet Chrome extension.',
}

export default function TermsPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-8">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2>Agreement to Terms</h2>
            <p>
              By accessing and using Prophet, you agree to be bound by these Terms of Service. If you do not agree to
              these terms, please do not use our service.
            </p>

            <h2>Description of Service</h2>
            <p>
              Prophet is a Chrome browser extension that provides AI assistance through integration with Claude AI.
              The service operates on a usage-based pricing model where you pay for API usage.
            </p>

            <h2>Account Registration</h2>
            <p>To use Prophet, you must:</p>
            <ul>
              <li>Be at least 13 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h2>Billing</h2>
            <h3>Usage-Based Pricing</h3>
            <p>
              Prophet charges based on actual API usage. Costs are calculated per token used in your AI conversations.
              Your monthly plan includes a usage allowance in dollars.
            </p>

            <h3>Subscription Plans</h3>
            <p>
              We offer multiple subscription tiers (Free, Pro, Premium, Ultra). Each plan includes a monthly usage
              allowance. Unused allowance does not roll over to the next billing period.
            </p>

            <h3>Refunds</h3>
            <p>
              Subscription payments are non-refundable. Cancellations take effect at the end of the
              current billing period.
            </p>

            <h2>Acceptable Use</h2>
            <p>You agree not to use Prophet to:</p>
            <ul>
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Generate harmful, abusive, or illegal content</li>
              <li>Attempt to circumvent usage limits or security measures</li>
              <li>Resell or redistribute the service</li>
              <li>Reverse engineer the extension</li>
            </ul>

            <h2>Service Availability</h2>
            <p>
              We strive to maintain high availability but do not guarantee uninterrupted service. We may suspend or
              terminate service for maintenance, security issues, or violations of these terms.
            </p>

            <h2>Intellectual Property</h2>
            <p>
              Prophet and its original content, features, and functionality are owned by Prophet and are protected by
              international copyright, trademark, and other intellectual property laws.
            </p>

            <h2>User Content</h2>
            <p>
              You retain ownership of content you input into Prophet. By using the service, you grant us permission to
              process your content through our AI provider (Anthropic) to provide the service.
            </p>

            <h2>Disclaimer of Warranties</h2>
            <p>
              Prophet is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the accuracy,
              reliability, or completeness of AI-generated content.
            </p>

            <h2>Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Prophet shall not be liable for any indirect, incidental,
              special, or consequential damages arising from your use of the service.
            </p>

            <h2>Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account at any time for violations of these terms or
              for any other reason at our discretion.
            </p>

            <h2>Changes to Terms</h2>
            <p>
              We may modify these terms at any time. Continued use of Prophet after changes constitutes acceptance of
              the new terms.
            </p>

            <h2>Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with applicable laws, without regard to
              conflict of law provisions.
            </p>

            <h2>Contact Information</h2>
            <p>
              For questions about these Terms of Service, please contact us through our contact form.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
