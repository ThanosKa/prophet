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
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: January 2026</p>
          </div>

          <div className="space-y-8">
                <section>
                  <h2 className="text-xl font-semibold mb-3">Introduction</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    At Prophet, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect
                    your information when you use our Chrome extension and services.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>

                  <h3 className="text-lg font-medium mb-2 mt-4">Account Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    When you create an account, we collect your email address, name, and authentication details through Clerk.
                  </p>

                  <h3 className="text-lg font-medium mb-2 mt-4">Usage Data</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    We collect information about how you use Prophet, including:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Chat messages and AI responses (processed but not stored)</li>
                    <li>Usage statistics (token counts, API costs)</li>
                    <li>Browser extension interactions</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">Payment Information</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Payment information is processed securely through Stripe. We do not store your full credit card details.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">We use your information to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Provide and improve our services</li>
                    <li>Process your AI requests through Anthropic&apos;s API</li>
                    <li>Manage your account and billing</li>
                    <li>Send important service updates</li>
                    <li>Analyze usage patterns to improve the product</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Data Storage and Security</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Your data is stored securely using industry-standard encryption. Chat messages are processed in real-time
                    and are not permanently stored on our servers. Usage statistics are retained for billing and analytics purposes.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">We use the following third-party services:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li><strong className="text-foreground">Anthropic:</strong> AI model API (chat processing)</li>
                    <li><strong className="text-foreground">Clerk:</strong> Authentication and user management</li>
                    <li><strong className="text-foreground">Stripe:</strong> Payment processing</li>
                    <li><strong className="text-foreground">Supabase:</strong> Database hosting</li>
                    <li><strong className="text-foreground">Upstash:</strong> Rate limiting</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">You have the right to:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Access your personal data</li>
                    <li>Request data deletion</li>
                    <li>Opt out of marketing communications</li>
                    <li>Export your usage data</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Data Retention</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We retain your account information as long as your account is active. Usage statistics are retained for
                    12 months. You can request deletion of your data at any time.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Children&apos;s Privacy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Prophet is not intended for users under 13 years of age. We do not knowingly collect information from children.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update this Privacy Policy from time to time. We will notify you of significant changes via email
                    or through the extension.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Contact Us</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have questions about this Privacy Policy, please contact us through our contact form.
                  </p>
                </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
