import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Book, Download, HelpCircle, Settings, Zap } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentation | Prophet',
  description: 'Learn how to use Prophet and get the most out of your AI assistant.',
}

const docs = [
  {
    title: 'Getting Started',
    description: 'Install Prophet and set up your account',
    icon: Download,
    href: '#getting-started',
  },
  {
    title: 'Using Prophet',
    description: 'Learn how to chat with Claude and manage conversations',
    icon: Zap,
    href: '#using-prophet',
  },
  {
    title: 'Account Settings',
    description: 'Manage your profile, billing, and subscription',
    icon: Settings,
    href: '#account-settings',
  },
  {
    title: 'Troubleshooting',
    description: 'Common issues and how to resolve them',
    icon: HelpCircle,
    href: '#troubleshooting',
  },
  {
    title: 'FAQ',
    description: 'Frequently asked questions',
    icon: Book,
    href: '/faq',
  },
]

export default function DocsPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20 flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Documentation</h1>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about using Prophet
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {docs.map((doc) => {
              const Icon = doc.icon
              return (
                <Link key={doc.title} href={doc.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{doc.title}</CardTitle>
                      <CardDescription>{doc.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-12">
            <section id="getting-started">
              <h2>Getting Started</h2>
              <h3>Installation</h3>
              <ol>
                <li>Visit the Chrome Web Store</li>
                <li>Search for &quot;Prophet&quot; or click the direct link from our homepage</li>
                <li>Click &quot;Add to Chrome&quot;</li>
                <li>Confirm the installation</li>
              </ol>

              <h3>Setting Up Your Account</h3>
              <ol>
                <li>Click the Prophet icon in your browser toolbar</li>
                <li>Click &quot;Sign In via Prophet Website&quot;</li>
                <li>Complete the sign-up process on the website</li>
                <li>Close and reopen the side panel to sync your session</li>
                <li>You&apos;re ready to start using Prophet!</li>
              </ol>
            </section>

            <section id="using-prophet">
              <h2>Using Prophet</h2>
              <h3>Starting a Conversation</h3>
              <p>
                Click the Prophet icon to open the side panel. Type your message in the input field and press Enter or
                click the send button. Claude will respond in real-time with streaming responses.
              </p>

              <h3>Managing Chats</h3>
              <p>
                All your conversations are automatically saved. You can view your chat history in the side panel and
                switch between conversations at any time.
              </p>

              <h3>Understanding Credits</h3>
              <p>
                Prophet uses a credit-based system. Each AI request consumes credits based on the number of tokens used.
                You can view your remaining credits in your account dashboard.
              </p>
            </section>

            <section id="account-settings">
              <h2>Account Settings</h2>
              <h3>Managing Your Subscription</h3>
              <p>
                Visit your account dashboard to view your current plan, upgrade or downgrade, and manage billing
                information through our secure Stripe integration.
              </p>

              <h3>Viewing Usage</h3>
              <p>
                The Usage page shows detailed statistics about your AI requests, including token counts and costs.
                You can filter by date and model, and export your usage data to CSV.
              </p>
            </section>

            <section id="troubleshooting">
              <h2>Troubleshooting</h2>
              <h3>Extension Not Working</h3>
              <ul>
                <li>Make sure you&apos;re signed in to your account</li>
                <li>Try closing and reopening the side panel</li>
                <li>Refresh the extension by going to chrome://extensions and clicking the reload button</li>
                <li>Clear your browser cache and cookies</li>
              </ul>

              <h3>Authentication Issues</h3>
              <ul>
                <li>Make sure you&apos;ve completed the sign-in process on the website</li>
                <li>Close and reopen the side panel after signing in</li>
                <li>Check that third-party cookies are enabled in Chrome</li>
              </ul>

              <h3>Chat Not Loading</h3>
              <ul>
                <li>Check your internet connection</li>
                <li>Verify you have credits remaining in your account</li>
                <li>Try refreshing the page or reopening the side panel</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
