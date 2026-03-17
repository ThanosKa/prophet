import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Prophet handles your data. Learn about browser permissions, data collection, encryption, and your privacy rights when using Prophet AI Chrome extension.',
  alternates: { canonical: '/privacy' },
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
                  <h2 className="text-xl font-semibold mb-3">Browser Access & Permissions</h2>

                  <h3 className="text-lg font-medium mb-2 mt-4">What Prophet Can Access</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Current page content (text, buttons, forms, links)</li>
                    <li>Page URL and title</li>
                    <li>Interactive elements on the page</li>
                    <li>Ability to click, type, and navigate</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">What Prophet Cannot Access</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Saved passwords or autofill data</li>
                    <li>Credit card information stored in browser</li>
                    <li>Browser history or bookmarks</li>
                    <li>Other tabs without explicit permission</li>
                    <li>Files on your computer</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Data Sent to Anthropic Claude API</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    When you use Prophet, the following information is sent to Anthropic's Claude API to process your requests:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Your conversation messages</li>
                    <li>Current page content the agent can see</li>
                    <li>Information about interactive elements (buttons, forms)</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">What We Store</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    To provide you with convenient features like chat history and usage tracking across devices, we securely store:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Your conversation messages and chat titles (encrypted at rest)</li>
                    <li>Usage statistics for billing transparency (token counts, API costs)</li>
                    <li>Account information (email, subscription status)</li>
                  </ul>
                  <p className="text-muted-foreground leading-relaxed mt-3">
                    <strong className="text-foreground">You maintain full control:</strong> Delete individual conversations or your entire account at any time. Deleting your account permanently removes all associated data.
                  </p>

                  <h3 className="text-lg font-medium mb-2 mt-4">What We Do NOT Store</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Page screenshots or recordings</li>
                    <li>Sensitive form data (passwords, credit cards)</li>
                    <li>Your browsing history</li>
                    <li>Data from other browser tabs</li>
                  </ul>

                  <h3 className="text-lg font-medium mb-2 mt-4">Why We Need Your Messages</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    For Claude AI to respond to your requests, it must read your message content. This is true for all AI assistants—encryption prevents the AI from understanding your request. We use industry-standard security (HTTPS, encryption at rest, secure databases) to protect your data in transit and storage.
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-semibold mb-3">Security Controls</h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Maximum 10 tool calls per conversation to prevent runaway behavior</li>
                    <li>Debugger connection auto-closes after 30 seconds of inactivity</li>
                    <li>Visual border indicator when agent is actively controlling the browser</li>
                    <li>Stop button always available during execution</li>
                    <li>Agent requests confirmation before destructive actions</li>
                  </ul>
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
                    If you have questions about this Privacy Policy, please contact us at{' '}
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
