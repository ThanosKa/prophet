import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Prophet',
  description: 'Privacy policy for Prophet Chrome extension.',
}

export default function PrivacyPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-8">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mb-8">Last updated: January 2026</p>

          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2>Introduction</h2>
            <p>
              At Prophet, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect
              your information when you use our Chrome extension and services.
            </p>

            <h2>Information We Collect</h2>
            <h3>Account Information</h3>
            <p>
              When you create an account, we collect your email address, name, and authentication details through Clerk.
            </p>

            <h3>Usage Data</h3>
            <p>
              We collect information about how you use Prophet, including:
            </p>
            <ul>
              <li>Chat messages and AI responses (processed but not stored)</li>
              <li>Usage statistics (token counts, API costs)</li>
              <li>Browser extension interactions</li>
            </ul>

            <h3>Payment Information</h3>
            <p>
              Payment information is processed securely through Stripe. We do not store your full credit card details.
            </p>

            <h2>How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide and improve our services</li>
              <li>Process your AI requests through Anthropic&apos;s API</li>
              <li>Manage your account and billing</li>
              <li>Send important service updates</li>
              <li>Analyze usage patterns to improve the product</li>
            </ul>

            <h2>Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption. Chat messages are processed in real-time
              and are not permanently stored on our servers. Usage statistics are retained for billing and analytics purposes.
            </p>

            <h2>Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul>
              <li><strong>Anthropic:</strong> AI model API (chat processing)</li>
              <li><strong>Clerk:</strong> Authentication and user management</li>
              <li><strong>Stripe:</strong> Payment processing</li>
              <li><strong>Supabase:</strong> Database hosting</li>
              <li><strong>Upstash:</strong> Rate limiting</li>
            </ul>

            <h2>Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Request data deletion</li>
              <li>Opt out of marketing communications</li>
              <li>Export your usage data</li>
            </ul>

            <h2>Data Retention</h2>
            <p>
              We retain your account information as long as your account is active. Usage statistics are retained for
              12 months. You can request deletion of your data at any time.
            </p>

            <h2>Children&apos;s Privacy</h2>
            <p>
              Prophet is not intended for users under 13 years of age. We do not knowingly collect information from children.
            </p>

            <h2>Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email
              or through the extension.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy, please contact us through our contact form.
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
