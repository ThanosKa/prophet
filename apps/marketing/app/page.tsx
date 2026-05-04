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
import { homeFaqs, faqPageJsonLd } from '@/lib/faqs'

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Prophet",
  "description": "AI-powered Chrome extension that brings Claude AI into the browser side panel for real-time chat, web page analysis, and browser automation with 18 built-in tools.",
  "applicationCategory": "BrowserApplication",
  "operatingSystem": "Chrome",
  "url": "https://prophetchrome.com",
  "downloadUrl": "https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif",
  "screenshot": "https://prophetchrome.com/hero.jpg",
  "author": { "@type": "Organization", "name": "Prophet", "url": "https://prophetchrome.com" },
  "offers": [
    { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "USD", "description": "$0.20 in API credits included" },
    { "@type": "Offer", "name": "Pro", "price": "9.99", "priceCurrency": "USD", "description": "$11 in API credits (+10% bonus)", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "9.99", "priceCurrency": "USD", "billingDuration": "P1M" } },
    { "@type": "Offer", "name": "Premium", "price": "29.99", "priceCurrency": "USD", "description": "$35 in API credits (+17% bonus)", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "29.99", "priceCurrency": "USD", "billingDuration": "P1M" } },
    { "@type": "Offer", "name": "Ultra", "price": "59.99", "priceCurrency": "USD", "description": "$70 in API credits (+17% bonus)", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "59.99", "priceCurrency": "USD", "billingDuration": "P1M" } }
  ],
  "featureList": ["Side panel integration", "Real-time streaming AI responses", "Browser automation with 18 tools", "Multiple Claude models (Haiku 4.5, Sonnet 4.6, Opus 4.6)", "Pay-per-use credit system", "Persistent chat history"]
}

const homepageFaqJsonLd = faqPageJsonLd(homeFaqs)

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqJsonLd) }}
      />
      <Header />
      <Hero />
      <section className="py-16 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6 text-center">What is Prophet?</h2>
          <p className="text-lg text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto">
            Prophet is an open-source, AI-powered Chrome extension that integrates Anthropic&apos;s Claude
            AI models directly into your browser&apos;s side panel. It supports Claude Haiku 4.5,
            Sonnet 4.6, and Opus 4.6 with real-time streaming responses, browser automation via
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
