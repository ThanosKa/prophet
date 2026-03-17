import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { breadcrumbJsonLd } from '@/lib/structured-data'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Best AI Chrome Extensions in 2026',
  description: 'A curated list of the 8 best AI Chrome extensions in 2026. Compare features, pricing, pros, and cons of Prophet, Monica, Merlin, Sider, MaxAI, Harpa, Glasp, and Compose AI.',
  alternates: { canonical: '/best-ai-chrome-extensions' },
}

const extensions = [
  {
    rank: 1,
    name: 'Prophet',
    tagline: 'AI side panel with Claude and browser automation',
    url: 'https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif',
    pricing: 'Free tier ($0.20 credits), Pro $9.99/mo, Premium $29.99/mo, Ultra $59.99/mo',
    description: 'Prophet brings Anthropic\'s Claude AI directly into the Chrome side panel with a focus on browser automation. Unlike most AI extensions that only offer chat, Prophet includes 18 built-in tools for interacting with web pages: clicking buttons, filling forms, navigating between pages, and extracting data. It uses the accessibility tree instead of screenshots, which makes automation faster and more reliable. The pay-per-use credit system means you only pay for what you actually use, and the full source code is available on GitHub.',
    pros: [
      'Browser automation with 18 tools (click, fill, navigate, extract)',
      'Accessibility tree approach is faster and cheaper than screenshot-based AI',
      'Pay-per-use credits instead of flat monthly fees for unused capacity',
      'Open source with full transparency into how it works',
      'Multiple Claude models (Haiku 4.5, Sonnet 4.6, Opus 4.6)',
    ],
    cons: [
      'Claude-only; no GPT or Gemini model options',
      'Newer product with a smaller user base compared to established players',
      'Browser automation requires Chrome DevTools permissions',
    ],
  },
  {
    rank: 2,
    name: 'Monica',
    tagline: 'All-in-one AI assistant with GPT-4, Claude, and Gemini',
    url: 'https://monica.im',
    pricing: 'Free tier (limited), Pro $9.90/mo, Unlimited $19.90/mo',
    description: 'Monica is one of the most popular AI Chrome extensions, offering access to multiple AI models including GPT-4o, Claude 3.5, and Gemini. It provides a chat sidebar, translation tools, writing assistance, and image generation. Monica excels at being a general-purpose AI assistant that works across different websites. The interface is polished and the extension supports a wide range of tasks from email writing to code explanation. However, it lacks the deep browser automation capabilities that tools like Prophet offer.',
    pros: [
      'Multi-model support (GPT-4o, Claude, Gemini)',
      'Polished, well-designed interface',
      'Built-in image generation and translation',
      'Large user base with regular updates',
    ],
    cons: [
      'No browser automation (cannot click, fill forms, or navigate)',
      'Unlimited plan still has daily limits on advanced models',
      'Privacy concerns with data processing through third-party servers',
    ],
  },
  {
    rank: 3,
    name: 'Merlin',
    tagline: 'AI assistant with web search and document analysis',
    url: 'https://www.getmerlin.in',
    pricing: 'Free tier (limited queries), Pro $14.25/mo, Team $12/mo per user',
    description: 'Merlin offers AI chat with web search capabilities, allowing it to provide up-to-date answers by searching the internet. It supports GPT-4o, Claude, and Llama models. Merlin is particularly strong at summarizing web pages, analyzing documents, and generating content. The web search integration sets it apart from pure chat-based extensions. It also offers team plans, making it suitable for small businesses and agencies that need shared AI access.',
    pros: [
      'Integrated web search for current information',
      'Document and PDF analysis',
      'Team plans with shared usage',
      'Supports multiple AI models',
    ],
    cons: [
      'Higher pricing than some competitors for the Pro tier',
      'Free tier is very limited (roughly 50 queries per day)',
      'No browser automation capabilities',
    ],
  },
  {
    rank: 4,
    name: 'Sider',
    tagline: 'AI sidebar with reading and writing tools',
    url: 'https://sider.ai',
    pricing: 'Free tier (limited), Basic $8.99/mo, Pro $12.99/mo, Unlimited $24.99/mo',
    description: 'Sider positions itself as a reading and writing companion. It sits in the Chrome sidebar and provides tools for summarizing pages, rewriting text, translating content, and generating replies. Sider supports ChatGPT, Claude, and Gemini, letting users switch between models based on the task. Its group chat feature lets you query multiple AI models simultaneously and compare answers. The extension has a clean interface and works well for everyday content tasks.',
    pros: [
      'Group chat feature to compare answers from multiple AI models',
      'Strong reading and writing toolset',
      'Clean sidebar interface with quick actions',
      'Reasonable pricing across tiers',
    ],
    cons: [
      'Advanced features locked behind higher tiers',
      'No browser automation or form filling',
      'Can feel sluggish when loading multiple models simultaneously',
    ],
  },
  {
    rank: 5,
    name: 'MaxAI',
    tagline: 'One-click AI tools for any webpage',
    url: 'https://www.maxai.me',
    pricing: 'Free tier (limited), Pro $9.99/mo, Elite $19.99/mo',
    description: 'MaxAI focuses on one-click AI actions. Select text on any webpage and get instant options: summarize, explain, translate, rewrite, or generate a reply. It integrates with GPT-4o, Claude, Gemini, and Llama models. MaxAI also offers a built-in search enhancement that adds AI summaries to Google search results. The highlight-and-action workflow is fast and intuitive, making it a good choice for users who want quick AI assistance without opening a full chat panel.',
    pros: [
      'Fast one-click actions on selected text',
      'AI-enhanced search results on Google',
      'Multiple model support with easy switching',
      'Minimal friction for quick tasks',
    ],
    cons: [
      'Limited depth compared to full chat-based assistants',
      'No browser automation or page interaction',
      'Free tier is heavily restricted',
    ],
  },
  {
    rank: 6,
    name: 'Harpa AI',
    tagline: 'AI agent with web automation and monitoring',
    url: 'https://harpa.ai',
    pricing: 'Free (bring your own API key), Pro $15/mo, Business custom pricing',
    description: 'Harpa AI stands out with its web automation and monitoring capabilities. It can track price changes on e-commerce sites, monitor web pages for content updates, and automate repetitive web tasks using custom commands. Harpa supports GPT-4, Claude, and local AI models via the bring-your-own-key model. The free tier is generous since you use your own API keys. For users who want both AI chat and web monitoring in one extension, Harpa is a strong contender, though its automation is more focused on monitoring than interactive browser control.',
    pros: [
      'Web page monitoring and price tracking',
      'Custom automation commands',
      'Bring your own API key for free usage',
      'Supports local AI models',
    ],
    cons: [
      'Complex interface with a steep learning curve',
      'Automation is monitoring-focused, not interactive (cannot fill forms or click buttons)',
      'Requires technical knowledge to use custom commands effectively',
    ],
  },
  {
    rank: 7,
    name: 'Glasp',
    tagline: 'Social web highlighter with AI summaries',
    url: 'https://glasp.co',
    pricing: 'Free',
    description: 'Glasp takes a different approach by combining social highlighting with AI. You can highlight text on any webpage, organize highlights into collections, and share them with others. Glasp adds AI-powered summaries for articles and YouTube videos. The social aspect means you can discover what other users find interesting on the same pages you read. It is best suited for researchers, students, and avid readers who want to capture and organize knowledge from the web. It is not a general-purpose AI assistant.',
    pros: [
      'Free to use with no paid tiers',
      'Social highlighting and knowledge sharing',
      'YouTube transcript summaries',
      'Good for research and note-taking workflows',
    ],
    cons: [
      'Narrow focus on highlighting and summarization only',
      'No chat, writing assistance, or browser automation',
      'Requires a social account and public profile',
    ],
  },
  {
    rank: 8,
    name: 'Compose AI',
    tagline: 'AI-powered autocomplete for writing',
    url: 'https://www.compose.ai',
    pricing: 'Free (basic autocomplete), Premium $9.99/mo',
    description: 'Compose AI specializes in one thing: making you type faster. It provides AI-powered autocomplete suggestions as you type in any text field on the web. Think of it as GitHub Copilot but for all web-based writing, including emails, documents, forms, and chat messages. Compose AI learns from your writing style over time and provides increasingly personalized suggestions. It is laser-focused on the writing use case and does not try to be a general AI assistant.',
    pros: [
      'Excellent autocomplete that learns your writing style',
      'Works in any text field across the web',
      'Lightweight with minimal performance impact',
      'Generous free tier for basic autocomplete',
    ],
    cons: [
      'Only does autocomplete; no chat, summarization, or automation',
      'Limited AI model options',
      'Premium features are not dramatically different from free',
    ],
  },
]

const faqItems = [
  {
    question: 'What is an AI Chrome extension?',
    answer: 'An AI Chrome extension is a browser add-on that integrates artificial intelligence capabilities directly into Google Chrome. These extensions can help with tasks like writing, summarizing web pages, translating content, answering questions, and in some cases automating browser interactions. They typically appear as a sidebar panel or popup overlay alongside the web page you are viewing.',
  },
  {
    question: 'Are AI Chrome extensions safe to use?',
    answer: 'Reputable AI Chrome extensions are generally safe, but you should review their permissions before installing. Look for extensions that request only the permissions they need, have clear privacy policies, and ideally are open source so you can verify their behavior. Be cautious with extensions that request access to all your browsing data. Prophet, for example, is fully open source on GitHub, so you can inspect exactly what data it accesses.',
  },
  {
    question: 'Which AI Chrome extension is best for writing?',
    answer: 'For general writing assistance (emails, documents, social media), Monica and Sider offer strong multi-model chat and rewriting tools. For autocomplete-style writing enhancement, Compose AI is the specialist. For writing that involves interacting with web forms or browser-based editors, Prophet can both draft content and fill it into the page using browser automation.',
  },
  {
    question: 'Can AI Chrome extensions access my private data?',
    answer: 'AI Chrome extensions can only access data on web pages you visit while the extension is active, and only within the permissions you grant. They cannot access files on your computer, passwords stored in Chrome, or data from other extensions. Always review the permissions an extension requests during installation. Extensions like Prophet process page content through a backend API to generate AI responses, but do not store your browsing history or page content long-term.',
  },
  {
    question: 'Do AI Chrome extensions work with all websites?',
    answer: 'Most AI Chrome extensions work on the majority of websites, but some sites with strict Content Security Policies may block extension scripts. Banking sites, internal corporate tools, and some government websites may restrict extension functionality. The side panel approach (used by Prophet, Monica, and Sider) tends to work more reliably across websites because it runs in a separate browser panel rather than injecting into the page.',
  },
  {
    question: 'What is the difference between AI chat extensions and AI automation extensions?',
    answer: 'AI chat extensions (like Monica, Sider, and MaxAI) let you talk to an AI model and get text responses. They can read page content but cannot interact with the page. AI automation extensions (like Prophet and Harpa) can also control the browser: clicking buttons, filling forms, navigating between pages, and extracting structured data. If you need the AI to actually do things on web pages rather than just talk about them, you need an automation-capable extension.',
  },
]

export default function BestAIChromeExtensionsPage() {
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
          { name: 'Best AI Chrome Extensions', url: 'https://prophetchrome.com/best-ai-chrome-extensions' },
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
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Best AI Chrome Extensions in 2026</h1>
            <p className="text-sm text-muted-foreground mb-6">Last updated: March 2026</p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              AI Chrome extensions have become essential productivity tools for anyone who works in a browser. Whether you need help writing emails, summarizing research, automating repetitive tasks, or analyzing web pages, there is an AI extension that fits your workflow. We tested and compared the most popular options to help you choose the right one.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              This list evaluates extensions on five criteria: AI model quality, feature depth, browser automation capabilities, pricing value, and privacy practices. We prioritize extensions that go beyond simple chat by offering meaningful integration with the web pages you visit.
            </p>
          </div>

          <div className="space-y-12">
            {extensions.map((ext) => (
              <section key={ext.rank} id={ext.name.toLowerCase().replace(/\s+/g, '-')} className="border rounded-lg p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {ext.rank}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{ext.name}</h2>
                    <p className="text-muted-foreground text-sm">{ext.tagline}</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-1"><strong className="text-foreground">Pricing:</strong> {ext.pricing}</p>

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
            <h2 className="text-2xl font-bold mb-6">Comparison Table</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-3 font-semibold">Extension</th>
                    <th className="text-left py-3 px-3 font-semibold">AI Models</th>
                    <th className="text-left py-3 px-3 font-semibold">Browser Automation</th>
                    <th className="text-left py-3 px-3 font-semibold">Free Tier</th>
                    <th className="text-left py-3 px-3 font-semibold">Starting Price</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Prophet</td><td className="py-3 px-3">Claude (Haiku, Sonnet, Opus)</td><td className="py-3 px-3">Yes (18 tools)</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">$9.99/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Monica</td><td className="py-3 px-3">GPT-4o, Claude, Gemini</td><td className="py-3 px-3">No</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">$9.90/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Merlin</td><td className="py-3 px-3">GPT-4o, Claude, Llama</td><td className="py-3 px-3">No</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">$14.25/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Sider</td><td className="py-3 px-3">GPT-4, Claude, Gemini</td><td className="py-3 px-3">No</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">$8.99/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">MaxAI</td><td className="py-3 px-3">GPT-4o, Claude, Gemini, Llama</td><td className="py-3 px-3">No</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">$9.99/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Harpa AI</td><td className="py-3 px-3">GPT-4, Claude, local models</td><td className="py-3 px-3">Monitoring only</td><td className="py-3 px-3">Yes (BYOK)</td><td className="py-3 px-3">$15/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Glasp</td><td className="py-3 px-3">Built-in (limited)</td><td className="py-3 px-3">No</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">Free</td></tr>
                  <tr><td className="py-3 px-3 font-medium text-foreground">Compose AI</td><td className="py-3 px-3">Built-in</td><td className="py-3 px-3">No</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">$9.99/mo</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6">How We Chose This List</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We evaluated over 20 AI Chrome extensions across several dimensions. Model quality matters, but what separates the best extensions is how deeply they integrate with your browsing experience. A great AI extension does not just answer questions; it understands the page you are on and can help you take action.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Browser automation is an emerging differentiator. Extensions that can interact with web pages, not just read them, unlock workflows that were previously impossible: automated form filling, data extraction, multi-step web tasks. We weighted this capability heavily because it represents the next evolution of AI browser tools.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Pricing transparency also factored into our rankings. Pay-per-use models like Prophet offer better value for light to moderate users compared to flat subscriptions. We noted which extensions offer genuine free tiers versus token-limited trials.
            </p>
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
          <h2 className="text-2xl font-bold mb-4">Try the Top-Ranked AI Chrome Extension</h2>
          <p className="text-muted-foreground mb-6">
            Install Prophet and get AI chat plus browser automation in your Chrome side panel. Free plan available.
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
