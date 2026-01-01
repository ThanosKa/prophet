import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { CTASection } from '@/components/CTASection'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Prophet',
  description: 'Learn about Prophet and our mission to bring AI assistance directly to your browser.',
}

export default function AboutPage() {
  return (
    <main className="flex flex-col min-h-screen">
      <Header />
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-center">About Prophet</h1>

          <div className="prose prose-lg dark:prose-invert mx-auto">
            <h2>Our Mission</h2>
            <p>
              At Prophet, we believe AI assistance should be seamlessly integrated into your daily workflow.
              Our mission is to make Claude&apos;s powerful AI capabilities accessible right from your browser,
              without disrupting your productivity.
            </p>

            <h2>Why Prophet?</h2>
            <p>
              We built Prophet because we were frustrated with constantly switching between tabs to use AI assistants.
              Prophet brings Claude directly into your browser&apos;s side panel, allowing you to get help,
              generate content, and solve problems without ever leaving your current task.
            </p>

            <h2>Our Values</h2>
            <ul>
              <li><strong>Transparency:</strong> We believe in clear, honest pricing. You only pay for what you use.</li>
              <li><strong>Privacy:</strong> Your data is yours. We don&apos;t store your conversations or use them for training.</li>
              <li><strong>Quality:</strong> We use the latest Claude models to ensure you get the best AI assistance available.</li>
              <li><strong>Simplicity:</strong> Complex technology should have simple interfaces. We focus on making AI accessible to everyone.</li>
            </ul>

            <h2>The Technology</h2>
            <p>
              Prophet is built on cutting-edge technology:
            </p>
            <ul>
              <li>Powered by Claude Sonnet 4.5, Anthropic&apos;s most advanced AI model</li>
              <li>Real-time streaming responses for instant feedback</li>
              <li>Secure authentication with Clerk</li>
              <li>Built with modern web technologies for a fast, responsive experience</li>
            </ul>

            <h2>Get Started</h2>
            <p>
              Join thousands of users who are already experiencing the power of AI assistance in their browser.
              Start with our free plan today and see how Prophet can transform your workflow.
            </p>
          </div>
        </div>
      </div>
      <CTASection />
      <Footer />
    </main>
  )
}
