import { Header } from '@/components/Header'
import { Hero } from '@/components/Hero'
import { TrustBadges } from '@/components/TrustBadges'
import { Features } from '@/components/Features'
import { Testimonials } from '@/components/Testimonials'
import { HowItWorks } from '@/components/HowItWorks'
import { TechPartners } from '@/components/TechPartners'
import { Pricing } from '@/components/Pricing'
import { FAQ } from '@/components/FAQ'
import { CTASection } from '@/components/CTASection'
import { Footer } from '@/components/Footer'
import { homeFaqs, faqNode } from '@/lib/faqs'
import { graphJsonLd, softwareApplicationNode } from '@/lib/structured-data'

const homeJsonLd = graphJsonLd([softwareApplicationNode, faqNode(homeFaqs)])

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <Header />
      <Hero />
      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6 text-center">What is Prophet?</h2>
          <p className="text-lg text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto">
            Prophet is an open-source, AI-powered Chrome extension that integrates Anthropic&apos;s Claude
            AI models directly into your browser&apos;s side panel. It supports Claude Haiku 4.5,
            Sonnet 5.5, and Opus 5.5 with real-time streaming responses, browser automation via
            18 built-in tools, and pay-per-use pricing starting from a <a href="/blog/is-claude-ai-free" className="text-primary hover:underline">free tier with all 3 Claude models</a>. Unlike
            screenshot-based browser AI tools, Prophet uses the accessibility tree for faster,
            more deterministic interactions with web pages. The full source code is available
            on{' '}<a href="https://github.com/ThanosKa/prophet" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a>.
          </p>
        </div>
      </section>
      <TrustBadges />
      <Features />
      <Testimonials />
      <HowItWorks />
      <TechPartners />
      <Pricing />
      <FAQ />
      <CTASection />
      <Footer />
    </main>
  )
}
