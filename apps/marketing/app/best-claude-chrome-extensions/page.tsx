import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Best Chrome Extensions for Claude AI in 2026',
  description: '5 best Claude AI Chrome extensions, ranked. Compare Prophet, Anthropic\'s official Claude in Chrome, Monica, Sider, and Harpa across models, browser automation, and pricing.',
  alternates: { canonical: '/best-claude-chrome-extensions' },
}

const extensions = [
  {
    rank: 1,
    name: 'Prophet',
    tagline: 'Claude AI side panel with browser automation',
    url: 'https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif',
    claudeModels: 'Haiku 4.5, Sonnet 4.6, Opus 4.6',
    pricing: 'Free tier ($0.20 credits), Pro $9.99/mo, Premium $29.99/mo, Ultra $59.99/mo',
    description: 'Prophet is a Chrome extension built specifically around Claude AI. It lives in the Chrome side panel and provides three Claude model options: Haiku 4.5 for fast, affordable tasks; Sonnet 4.6 for balanced performance; and Opus 4.6 for the most complex reasoning. What makes Prophet unique among Claude extensions is its browser automation layer. Using 18 built-in tools, Prophet can interact with web pages on your behalf: clicking buttons, filling forms, navigating between pages, extracting data, and managing browser tabs. This is powered by the accessibility tree rather than screenshots, making it faster and more reliable than vision-based approaches. The pay-per-use credit system means you pay only for the API tokens you consume, with higher tiers offering bonus credits. For Claude power users who want the AI to not just analyze web pages but take action on them, Prophet is the most capable option. The entire codebase is open source on GitHub, providing full transparency into how Claude is integrated and how your data flows through the system.',
    pros: [
      'All three major Claude models available (Haiku 4.5, Sonnet 4.6, Opus 4.6)',
      'Browser automation with 18 tools for real page interaction',
      'Pay-per-use credits tied to actual Claude API costs',
      'Open source for full transparency',
      'Accessibility tree approach is faster and cheaper than screenshot methods',
      'Persistent chat history with conversation management',
    ],
    cons: [
      'Claude-exclusive; no fallback to other AI providers',
      'Browser automation requires Chrome DevTools debug permissions',
      'Newer product with a growing but smaller community',
    ],
  },
  {
    rank: 2,
    name: 'Claude in Chrome (by Anthropic)',
    tagline: 'Official Anthropic browser extension',
    url: 'https://www.anthropic.com/news/claude-for-chrome',
    claudeModels: 'Claude 4 Sonnet (default)',
    pricing: 'Requires Claude Pro ($20/mo), Team ($25/mo per user), or Enterprise subscription',
    description: 'Claude in Chrome is Anthropic\'s official browser extension. It provides Claude as a sidebar assistant that can see and interact with web pages using Computer Use, Anthropic\'s screenshot-based browser automation technology. Since it comes directly from Anthropic, it has the deepest integration with Claude\'s capabilities and is the first to receive new features. The extension requires an active Claude Pro, Team, or Enterprise subscription. Computer Use works by taking screenshots of the page, analyzing them with Claude\'s vision capabilities, and then simulating mouse clicks at specific coordinates. This approach is flexible but inherently slower and more expensive in tokens than text-based methods. Claude in Chrome is the best choice for users already paying for a Claude subscription who want official support and the latest Claude features. However, the subscription-based pricing means you pay the same whether you use the extension for 5 minutes or 5 hours per day.',
    pros: [
      'Official Anthropic product with first-party support',
      'Computer Use for visual browser automation',
      'Deep Claude integration with the latest model features',
      'Works within existing Claude subscription',
    ],
    cons: [
      'Requires minimum $20/mo Claude subscription',
      'Screenshot-based approach is slower than accessibility tree methods',
      'Higher token costs due to vision processing (images are expensive)',
      'Coordinate-based clicking is less precise than UID-based targeting',
    ],
  },
  {
    rank: 3,
    name: 'Monica (Claude mode)',
    tagline: 'Multi-model assistant with Claude access',
    url: 'https://monica.im',
    claudeModels: 'Claude 3.5 Sonnet',
    pricing: 'Free tier (limited), Pro $9.90/mo, Unlimited $19.90/mo',
    description: 'Monica is a popular multi-model AI extension that includes Claude 3.5 Sonnet among its available models. While not Claude-exclusive, Monica provides a convenient way to access Claude alongside GPT-4o and Gemini in a single extension. You can switch between models based on the task: use Claude for nuanced writing and analysis, GPT for general chat, and Gemini for tasks that benefit from Google\'s data. Monica\'s Claude access is limited to Claude 3.5 Sonnet; it does not offer Haiku or Opus options. The sidebar interface is polished and includes translation, summarization, rewriting, and image generation tools. For users who want Claude as one tool in a broader AI toolkit rather than their primary model, Monica is a solid choice. However, the Claude model version tends to lag behind the latest releases.',
    pros: [
      'Claude alongside GPT-4o and Gemini in one extension',
      'Polished sidebar with writing and translation tools',
      'Lower entry price than dedicated Claude subscriptions',
      'Easy model switching based on task requirements',
    ],
    cons: [
      'Limited to Claude 3.5 Sonnet; no Haiku or Opus',
      'Claude model updates may lag behind Anthropic releases',
      'No browser automation capabilities',
      'Daily caps on Claude usage even on Unlimited plan',
    ],
  },
  {
    rank: 4,
    name: 'Sider (Claude mode)',
    tagline: 'Reading companion with Claude option',
    url: 'https://sider.ai',
    claudeModels: 'Claude 3.5 Sonnet',
    pricing: 'Free tier, Basic $8.99/mo, Pro $12.99/mo, Unlimited $24.99/mo',
    description: 'Sider includes Claude 3.5 Sonnet as one of its available models within its reading and writing sidebar. Sider\'s unique group chat feature lets you compare Claude\'s response against GPT and Gemini on the same prompt, which is valuable for understanding each model\'s strengths. Claude on Sider is best for text analysis, summarization, and content generation tasks. The sidebar adapts its tools based on the current page context, offering different options for articles, code, email, and general browsing. Like Monica, Sider provides Claude access within a multi-model framework, but with a stronger emphasis on reading assistance and content comprehension. The Claude model selection is limited to Sonnet, and power users who need Haiku for cost efficiency or Opus for maximum capability will need to look elsewhere.',
    pros: [
      'Group chat to compare Claude against other models',
      'Context-adaptive sidebar tools for different page types',
      'Good reading and summarization features',
      'Competitive pricing starting at $8.99/mo',
    ],
    cons: [
      'Limited to Claude 3.5 Sonnet only',
      'No browser automation from the sidebar',
      'Unlimited plan at $24.99 is expensive for sidebar access',
      'Claude-specific features are no different from other models in the UI',
    ],
  },
  {
    rank: 5,
    name: 'Harpa AI (Claude via BYOK)',
    tagline: 'Bring your own Claude API key',
    url: 'https://harpa.ai',
    claudeModels: 'Any Claude model via your API key',
    pricing: 'Free with your own API key, Pro $15/mo',
    description: 'Harpa AI supports Claude through its bring-your-own-key (BYOK) feature. Instead of paying Harpa for Claude access, you enter your own Anthropic API key and pay Anthropic directly for usage. This gives you access to any Claude model available through the API, including the latest releases, at Anthropic\'s direct pricing without markup. Harpa adds value through its web monitoring features (price tracking, page change alerts) and custom command system. The BYOK approach makes Harpa the most cost-effective way to use Claude in a browser extension if you already have an Anthropic API key. However, the setup requires technical knowledge, and the interface prioritizes power users over simplicity. Harpa\'s automation is focused on monitoring and alerts rather than interactive browser control.',
    pros: [
      'Access any Claude model through your own API key',
      'No markup on Claude API pricing',
      'Web monitoring and custom commands add unique value',
      'Flexible model selection as new Claude versions release',
    ],
    cons: [
      'Requires technical setup with an Anthropic API key',
      'Interface is complex and not beginner-friendly',
      'Automation is monitoring-focused, not interactive',
      'No official Claude integration or support from Anthropic',
    ],
  },
]

const faqItems = [
  {
    question: 'Why use a Chrome extension for Claude instead of claude.ai?',
    answer: 'Chrome extensions provide Claude access alongside the web page you are working on. Instead of switching between tabs to copy content to claude.ai, a sidebar extension lets Claude read the current page directly. Extensions with browser automation can go further by letting Claude interact with the page: filling forms, clicking buttons, and extracting data. This context-aware access makes extensions more productive for web-based workflows than the standalone claude.ai interface.',
  },
  {
    question: 'Which Claude model should I choose?',
    answer: 'Haiku 4.5 is best for fast, simple tasks like quick questions, short summaries, and basic analysis. It is the cheapest option per token. Sonnet 4.6 balances speed and capability for most everyday tasks including writing, code analysis, and detailed explanations. Opus 4.6 is the most capable model for complex reasoning, multi-step planning, and tasks requiring deep analysis. Start with Sonnet for most tasks and switch to Haiku for cost savings on simple tasks or Opus when you need maximum quality.',
  },
  {
    question: 'Is Prophet better than Claude in Chrome from Anthropic?',
    answer: 'They serve different use cases. Claude in Chrome uses screenshot-based Computer Use for browser automation, which is flexible but slower and more expensive in tokens. Prophet uses the accessibility tree, which is faster, cheaper, and more deterministic for structured web interactions. Claude in Chrome benefits from first-party Anthropic support and always has the latest Claude features. Prophet offers pay-per-use pricing, open source transparency, and the choice between three Claude models. If you already pay for a Claude subscription, Claude in Chrome is convenient. If you want cost-efficient automation with model flexibility, Prophet is the better fit.',
  },
  {
    question: 'Can I use Claude for free in a Chrome extension?',
    answer: 'Prophet offers a free tier with $0.20 in API credits, which is enough to test the extension with a reasonable number of conversations. Harpa AI lets you use Claude for free if you have your own Anthropic API key (you pay Anthropic directly for token usage). Monica and Sider have free tiers but limit Claude access on the free plan. There is no fully free, unlimited Claude access in any extension because Anthropic charges for API usage.',
  },
]

export default function BestClaudeChromeExtensionsPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd([
          { name: 'Home', url: 'https://prophetchrome.com' },
          { name: 'Best Claude Chrome Extensions', url: 'https://prophetchrome.com/best-claude-chrome-extensions' },
        ])) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Header />
      <article className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Best Chrome Extensions for Claude AI in 2026</h1>
            <p className="text-sm text-muted-foreground mb-6">Last updated: March 2026</p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Claude is one of the most capable AI models available, and Chrome extensions are the most natural way to integrate it into your browsing workflow. Rather than switching to claude.ai every time you need help, these extensions bring Claude directly to the page you are working on. Some offer Claude as one option among many models. Others are built entirely around Claude, taking full advantage of its strengths in reasoning, writing, and analysis.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We focused this comparison on how well each extension leverages Claude specifically. Having access to Claude is table stakes; what matters is the depth of integration, which Claude models are available, and whether the extension adds capabilities beyond what you get at claude.ai. Browser automation, pay-per-use pricing, and transparency about Claude API usage all factored into our rankings. Want to use Claude without paying for a subscription? See our guide on{' '}
              <Link href="/blog/is-claude-ai-free" className="text-primary hover:underline">every free way to use Claude AI in 2026</Link>.
            </p>
          </div>

          <div className="space-y-12">
            {extensions.map((ext) => (
              <section key={ext.rank} id={ext.name.toLowerCase().replace(/[\s()]/g, '-')} className="border rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {ext.rank}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{ext.name}</h2>
                    <p className="text-muted-foreground text-sm">{ext.tagline}</p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-1"><strong className="text-foreground">Claude Models:</strong> {ext.claudeModels}</div>
                <div className="text-sm text-muted-foreground mb-1"><strong className="text-foreground">Pricing:</strong> {ext.pricing}</div>

                <p className="text-muted-foreground leading-relaxed mt-4 mb-4">{ext.description}</p>

                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-green-600 dark:text-green-400">Pros</h3>
                    <ul className="space-y-1.5">
                      {ext.pros.map((pro, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-green-600 dark:text-green-400 flex-shrink-0">+</span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm mb-2 text-red-600 dark:text-red-400">Cons</h3>
                    <ul className="space-y-1.5">
                      {ext.cons.map((con, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-red-600 dark:text-red-400 flex-shrink-0">-</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <section className="mt-16 mb-12">
            <h2 className="text-2xl font-bold mb-6">Claude Extensions Compared</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-semibold">Extension</th>
                    <th className="text-left py-3 px-3 font-semibold">Claude Models</th>
                    <th className="text-left py-3 px-3 font-semibold">Automation</th>
                    <th className="text-left py-3 px-3 font-semibold">Open Source</th>
                    <th className="text-left py-3 px-3 font-semibold">Starting Price</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Prophet</td><td className="py-3 px-3">Haiku, Sonnet, Opus</td><td className="py-3 px-3">Yes (18 tools)</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">Free / $9.99</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Claude in Chrome</td><td className="py-3 px-3">Sonnet (default)</td><td className="py-3 px-3">Computer Use</td><td className="py-3 px-3">No</td><td className="py-3 px-3">$20/mo sub</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Monica</td><td className="py-3 px-3">Claude 3.5 Sonnet</td><td className="py-3 px-3">No</td><td className="py-3 px-3">No</td><td className="py-3 px-3">$9.90/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Sider</td><td className="py-3 px-3">Claude 3.5 Sonnet</td><td className="py-3 px-3">No</td><td className="py-3 px-3">No</td><td className="py-3 px-3">$8.99/mo</td></tr>
                  <tr><td className="py-3 px-3 font-medium text-foreground">Harpa AI</td><td className="py-3 px-3">Any (BYOK)</td><td className="py-3 px-3">Monitoring</td><td className="py-3 px-3">Partial</td><td className="py-3 px-3">Free (BYOK)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqItems.map((item, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-2">{item.question}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </article>

      <section className="py-16 text-center border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-4">Get Claude AI in Your Browser</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet for Claude Haiku, Sonnet, and Opus with browser automation. Free plan available.
          </p>
          <Button asChild>
            <Link href="https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif">
              Add to Chrome
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </main>
  )
}
