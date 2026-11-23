import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { InstallCta } from '@/components/InstallCta'
import { RelatedLinks } from '@/components/RelatedLinks'
import { breadcrumbNode, graphJsonLd, listicleItemListNode } from '@/lib/structured-data'
import { faqNode } from '@/lib/faqs'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Claude Chrome Extension (2026): Official + 4 Alternatives' },
  description:
    "The official Claude extension is Anthropic's Claude in Chrome: paid plans and Google Chrome only. How to install it, plus 4 Claude alternatives compared.",
  alternates: { canonical: '/best-claude-chrome-extensions' },
}

const extensions = [
  {
    rank: 1,
    name: 'Prophet',
    tagline: 'Claude AI side panel with browser automation',
    url: 'https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif',
    claudeModels: 'Haiku 5.5, Sonnet 5.5, Opus 5.5',
    pricing: 'Free tier ($0.07 credits to try Haiku), Pro $9.99/mo, Premium $29.99/mo, Ultra $59.99/mo',
    description: 'Prophet is a Chrome extension built specifically around Claude AI. It lives in the Chrome side panel and provides three Claude model options: Haiku 5.5 for fast, affordable tasks; Sonnet 5.5 for balanced performance; and Opus 5.5 for the most complex reasoning. What makes Prophet unique among Claude extensions is its browser automation layer. Using 19 built-in tools, Prophet can interact with web pages on your behalf: clicking buttons, filling forms, navigating between pages, reading page content, and managing browser tabs. This is powered by the accessibility tree rather than screenshots, making it faster and more reliable than vision-based approaches. The pay-per-use credit system means you pay only for the tokens you consume, and every plan includes credits equal to its price. For Claude power users who want the AI to not just analyze web pages but take action on them, Prophet is the most capable option. The entire codebase is open source on GitHub, providing full transparency into how Claude is integrated and how your data flows through the system.',
    pros: [
      'All three major Claude models available (Haiku 5.5, Sonnet 5.5, Opus 5.5)',
      'Browser automation with 19 tools for real page interaction',
      'Pay-per-use credits charged by the Claude tokens you use',
      'Open source for full transparency',
      'Reads pages as a text snapshot of the accessibility tree, with no screenshots',
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
    url: 'https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn',
    claudeModels: 'All public Claude models (per Anthropic, November 2026)',
    pricing: 'Included with paid Claude plans (Pro from $20/mo, Max, Ultra, Team, Enterprise); not on the Free plan',
    description: 'Claude in Chrome is Anthropic\'s official browser extension, listed simply as "Claude" (publisher: Anthropic) in the Chrome Web Store. It opens Claude in a side panel next to the page you are on. Per Anthropic\'s help center (November 2026), it reads the text of web pages and, when you ask it to complete a task, controls the browser by clicking buttons, typing text and taking screenshots; you can also share a screenshot of part of the screen. It is available on paid Claude plans only (Pro, Max, Ultra, Team and Enterprise), not on the Free plan, and it runs only in Google Chrome: Anthropic says it is not supported on other Chromium-based browsers or on mobile. On Team and Enterprise plans, admins can turn it off or limit which sites it may visit. Claude in Chrome is the best choice if you already pay for a Claude plan and want first-party support. The trade-off is the subscription: you pay the same whether you use it for 5 minutes or 5 hours a day.',
    pros: [
      'Official Anthropic product with first-party support',
      'Reads pages and acts on them: clicks, types, navigates and fills forms',
      'Included in an existing paid Claude plan; no separate fee',
      'Team and Enterprise admins can restrict sites or turn it off',
    ],
    cons: [
      'Not available on the Free Claude plan; Pro starts at $20/mo',
      'Google Chrome only: not supported on Edge, Brave, other Chromium browsers or mobile',
      'Flat subscription, whether you use it a little or a lot',
    ],
  },
  {
    rank: 3,
    name: 'Monica (Claude mode)',
    tagline: 'Multi-model assistant with Claude access',
    url: 'https://monica.im',
    claudeModels: 'Claude alongside GPT and Gemini (versions set by Monica)',
    pricing: 'Free tier (limited), Pro $9.90/mo, Unlimited $19.90/mo',
    description: 'Monica is a popular multi-model AI extension that includes Claude among its available models. While not Claude-exclusive, Monica provides a convenient way to access Claude alongside GPT and Gemini in a single extension. You can switch between models based on the task: use Claude for nuanced writing and analysis, GPT for general chat, and Gemini for tasks that benefit from Google\'s data. The sidebar interface is polished and includes translation, summarization, rewriting, and image generation tools. For users who want Claude as one tool in a broader AI toolkit rather than their primary model, Monica is a solid choice. However, the Claude model version tends to lag behind the latest releases.',
    pros: [
      'Claude alongside GPT and Gemini in one extension',
      'Polished sidebar with writing and translation tools',
      'Lower entry price than dedicated Claude subscriptions',
      'Easy model switching based on task requirements',
    ],
    cons: [
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
    claudeModels: 'Claude alongside GPT and Gemini (versions set by Sider)',
    pricing: 'Free tier, Basic $8.99/mo, Pro $12.99/mo, Unlimited $24.99/mo',
    description: 'Sider includes Claude as one of its available models within its reading and writing sidebar. Sider\'s unique group chat feature lets you compare Claude\'s response against GPT and Gemini on the same prompt, which is valuable for understanding each model\'s strengths. Claude on Sider is best for text analysis, summarization, and content generation tasks. The sidebar adapts its tools based on the current page context, offering different options for articles, code, email, and general browsing. Like Monica, Sider provides Claude access within a multi-model framework, but with a stronger emphasis on reading assistance and content comprehension.',
    pros: [
      'Group chat to compare Claude against other models',
      'Context-adaptive sidebar tools for different page types',
      'Good reading and summarization features',
      'Competitive pricing starting at $8.99/mo',
    ],
    cons: [
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
    pricing: 'Free with your own API key, Pro $12/mo',
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
    answer: 'Haiku 5.5 is best for fast, simple tasks like quick questions, short summaries, and basic analysis. It is the cheapest option per token. Sonnet 5.5 balances speed and capability for most everyday tasks including writing, code analysis, and detailed explanations. Opus 5.5 is the most capable model for complex reasoning, multi-step planning, and tasks requiring deep analysis. Start with Sonnet for most tasks and switch to Haiku for cost savings on simple tasks or Opus when you need maximum quality.',
  },
  {
    question: 'Is Prophet better than Claude in Chrome from Anthropic?',
    answer: 'They serve different use cases. Both read the page and act on it. Per Anthropic, Claude in Chrome reads page text and controls the browser by clicking, typing and taking screenshots. Prophet reads a text snapshot of the page\'s accessibility tree and targets elements by ID, without screenshots. Claude in Chrome benefits from first-party Anthropic support and always has the latest Claude features. Prophet offers pay-per-use pricing, open source transparency, and the choice between three Claude models. If you already pay for a Claude subscription, Claude in Chrome is convenient. If you want cost-efficient automation with model flexibility, Prophet is the better fit.',
  },
  {
    question: 'Can I use Claude for free in a Chrome extension?',
    answer: 'Prophet offers a free tier with a one-time $0.07 in credits, which is enough to try the extension on Claude Haiku. Harpa AI lets you use Claude for free if you have your own Anthropic API key (you pay Anthropic directly for token usage). Monica and Sider have free tiers but limit Claude access on the free plan. There is no fully free, unlimited Claude access in any extension because Anthropic charges for API usage.',
  },
  {
    question: 'What are the best browser extensions for Claude AI in 2026?',
    answer: 'As of November 2026, the strongest browser extensions for Claude AI are Prophet (Haiku 5.5, Sonnet 5.5, and Opus 5.5 with pay-per-use credits and accessibility-tree browser automation), Anthropic\'s official Claude in Chrome (needs a paid Claude plan, from $20/mo for Pro, and runs only in Google Chrome), Monica and Sider (multi-model sidebars that include Claude alongside GPT and Gemini), and Harpa AI (bring-your-own-Anthropic-key for unmarked Claude API access). Prophet is the only one in this list built exclusively around Claude.',
  },
  {
    question: 'Which is the best Claude Chrome extension for 2026?',
    answer: 'For most users in 2026, Prophet is the best Claude Chrome extension. It is the only sidebar that offers all three production Claude models (Haiku 5.5, Sonnet 5.5, Opus 5.5), pairs them with 19 browser automation tools, and bills pay-per-use against your actual Anthropic API spend instead of a flat monthly fee. If you already pay for a Claude plan, Anthropic\'s own Claude in Chrome is the natural pick for first-party support, as long as you use Google Chrome.',
  },
  {
    question: 'Is there a Claude AI Chrome extension in 2026?',
    answer: 'Yes. Anthropic ships an official one, Claude in Chrome, which works on paid Claude plans (Pro, Max, Ultra, Team and Enterprise) but not on the Free plan, as of November 2026. At least four more extensions give you Claude in Chrome. Prophet is a Claude-exclusive open-source side panel with browser automation and pay-per-use pricing. Monica, Sider, and Harpa AI all expose Claude as one model among several. Prophet and Harpa are the cheapest entry points; Anthropic\'s extension is the deepest first-party integration.',
  },
]

const PAGE_URL = 'https://prophetchrome.com/best-claude-chrome-extensions'

const ENTRY_PRICE: Record<number, string> = { 2: '20' }

export default function BestClaudeChromeExtensionsPage() {
  const jsonLd = graphJsonLd([
    listicleItemListNode({
      name: 'Best Claude Chrome Extensions 2026',
      description: 'Five Claude Chrome extensions ranked on model access, browser automation and price.',
      url: PAGE_URL,
      items: extensions.map((ext) => ({
        position: ext.rank,
        name: ext.name,
        description: ext.tagline,
        url: ext.url,
        price: ENTRY_PRICE[ext.rank] ?? '0',
      })),
    }),
    faqNode(faqItems),
    breadcrumbNode([
      { name: 'Home', url: 'https://prophetchrome.com' },
      { name: 'Best Claude Chrome Extensions', url: PAGE_URL },
    ]),
  ])

  return (
    <main className="flex flex-col min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <article className="py-20 flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">Claude Chrome Extensions in 2026: the Official One and 4 Alternatives</h1>
            <p className="text-sm text-muted-foreground mb-6">Last updated: November 23, 2026</p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The official Claude extension for Chrome is Anthropic&apos;s Claude in Chrome, and it only works on a paid Claude plan (Pro from $20/month, Max, Ultra, Team or Enterprise), not on the Free plan, and it runs only in Google Chrome, as of November 2026. If you do not want a Claude subscription, Prophet gives you Claude Haiku, Sonnet and Opus in the Chrome side panel on pay-per-use credits, and Monica, Sider and Harpa AI offer Claude as one model among several. All five are compared below on Claude models, browser automation and price.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We focused this comparison on how well each extension leverages Claude specifically. Having access to Claude is table stakes; what matters is the depth of integration, which Claude models are available, and whether the extension adds capabilities beyond what you get at claude.ai. Browser automation, pay-per-use pricing, and transparency about Claude API usage all factored into the rankings. Pricing and feature claims come from each vendor&apos;s own pages and store listings. Want to use Claude without paying for a subscription? See our guide on{' '}
              <Link href="/blog/is-claude-ai-free" className="text-primary hover:underline">every free way to use Claude AI in 2026</Link>.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">How to install the official Claude extension for Chrome</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Anthropic&apos;s help center gives these steps (November 2026). You need a paid Claude plan and Google Chrome.
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Open Google Chrome. Other Chromium browsers such as Edge or Brave are not supported.</li>
              <li>
                Open the{' '}
                <a href="https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn" className="text-primary hover:underline" rel="noopener noreferrer" target="_blank">Claude listing in the Chrome Web Store</a>{' '}
                and click &quot;Add to Chrome&quot;.
              </li>
              <li>Sign in with your Claude account.</li>
              <li>Pin the extension: click the puzzle-piece icon, then the pin next to &quot;Claude&quot;.</li>
              <li>Grant the permissions it asks for. Reading pages needs the scripting permission; clicking and typing need the debugger permission.</li>
            </ol>
            <p className="text-muted-foreground leading-relaxed mt-4">
              Several third-party extensions in the Chrome Web Store have &quot;Claude&quot; in their names. The official one is listed as &quot;Claude&quot; with Anthropic as the publisher. Source:{' '}
              <a href="https://support.claude.com/en/articles/12012173" className="text-primary hover:underline" rel="noopener noreferrer" target="_blank">Get started with Claude in Chrome</a>.
              On the Free plan, or in another browser, one of the four alternatives below is the way to get Claude next to the page.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Claude AI Chrome Extension Picks for 2026</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are searching for a Claude AI Chrome extension in 2026 or the best Claude Chrome extension for 2026, the five options below are the picks worth installing today. Prophet, Anthropic&apos;s official Claude in Chrome, Monica, Sider, and Harpa AI cover the full spectrum from Claude-exclusive automation to multi-model sidebars to bring-your-own-key power-user setups.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Browser Extensions for Claude AI</h2>
            <p className="text-muted-foreground leading-relaxed">
              "Chrome extension" and "browser extension" describe the same thing here — a small add-on that lives in Chrome (or a Chromium-based browser like Edge, Brave, or Arc) and surfaces Claude in a sidebar, side panel, or popup. All five browser extensions for Claude AI ranked below install from the Chrome Web Store. Four of them also run on other Chromium browsers; Anthropic&apos;s Claude in Chrome is the exception, as Anthropic supports it only in Google Chrome. If you are on Firefox or Safari, none of the Claude-specific options below are available natively; the closest equivalents there are general-purpose AI sidebars without dedicated Claude integration.
            </p>
          </section>

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
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Prophet</td><td className="py-3 px-3">Haiku, Sonnet, Opus</td><td className="py-3 px-3">Yes (19 tools)</td><td className="py-3 px-3">Yes</td><td className="py-3 px-3">Free / $9.99</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Claude in Chrome</td><td className="py-3 px-3">All public models</td><td className="py-3 px-3">Yes (reads, clicks, types)</td><td className="py-3 px-3">No</td><td className="py-3 px-3">Paid Claude plan ($20/mo+)</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Monica</td><td className="py-3 px-3">Claude + GPT + Gemini</td><td className="py-3 px-3">No</td><td className="py-3 px-3">No</td><td className="py-3 px-3">$9.90/mo</td></tr>
                  <tr className="border-b"><td className="py-3 px-3 font-medium text-foreground">Sider</td><td className="py-3 px-3">Claude + GPT + Gemini</td><td className="py-3 px-3">No</td><td className="py-3 px-3">No</td><td className="py-3 px-3">$8.99/mo</td></tr>
                  <tr><td className="py-3 px-3 font-medium text-foreground">Harpa AI</td><td className="py-3 px-3">Any (BYOK)</td><td className="py-3 px-3">Monitoring</td><td className="py-3 px-3">Partial</td><td className="py-3 px-3">Free (BYOK)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Head-to-head comparisons</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The rankings above are a summary. If you have narrowed the choice down to two products,
              these pages go feature by feature on page understanding, automation depth, pricing, and
              data handling.
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li>
                <Link href="/compare/prophet-vs-claude-in-chrome" className="text-primary font-medium hover:underline">
                  Prophet vs Claude in Chrome
                </Link>{' '}
                — two ways of letting Claude act on a page, and
                what the $20/mo subscription requirement actually buys you.
              </li>
              <li>
                <Link href="/compare/prophet-vs-sider" className="text-primary font-medium hover:underline">
                  Prophet vs Sider
                </Link>{' '}
                — Claude-exclusive automation against Sider&apos;s multi-model sidebar and group chat.
              </li>
              <li>
                <Link href="/compare/prophet-vs-monica-ai" className="text-primary font-medium hover:underline">
                  Prophet vs Monica AI
                </Link>{' '}
                — where Monica&apos;s breadth beats depth, and where it does not.
              </li>
              <li>
                <Link href="/compare/prophet-vs-harpa-ai" className="text-primary font-medium hover:underline">
                  Prophet vs HARPA AI
                </Link>{' '}
                — AI-driven automation against HARPA&apos;s macro recorder and bring-your-own-key model.
              </li>
              <li>
                <Link href="/compare" className="text-primary font-medium hover:underline">
                  All Claude extension comparisons
                </Link>{' '}
                — every head-to-head we have published.
              </li>
            </ul>
          </section>

          <RelatedLinks
            title="Claude pricing and free access"
            intro="The most common follow-up question after picking an extension is what it will actually cost. These go into the numbers."
            links={[
              {
                href: '/free-claude-ai',
                anchor: 'Free Claude AI: every free tier and limit',
                context:
                  'what you get for $0 on claude.ai, why free unlimited Claude Sonnet 5.5 does not exist, and the honest alternatives.',
              },
              {
                href: '/blog/use-claude-without-subscription',
                anchor: 'How to use Claude without a subscription',
                context: 'the pay-per-use route for people who cannot justify $20 a month.',
              },
              {
                href: '/blog/claude-haiku-vs-sonnet-vs-opus',
                anchor: 'Claude Haiku vs Sonnet vs Opus',
                context: 'which of the three models to pick per task, and what the cost difference really is.',
              },
              {
                href: '/tools/ai-api-cost-calculator',
                anchor: 'Claude API cost calculator',
                context: 'price your own message volume against current Anthropic token rates.',
              },
              {
                href: '/pricing',
                anchor: 'Prophet credit pricing',
                context: 'the four tiers, the credits each one includes, and what a credit actually buys.',
              },
            ]}
          />

          <RelatedLinks
            title="Claude in your actual workflow"
            intro="Once Claude is in the side panel, these cover what people do with it day to day."
            links={[
              {
                href: '/best-ai-sidebar-extensions',
                anchor: 'Best AI sidebar extensions for Chrome',
                context: 'the wider sidebar category, including non-Claude options worth knowing about.',
              },
              {
                href: '/best-ai-chrome-extensions',
                anchor: 'Best AI Chrome extensions overall',
                context: 'nine extensions ranked across all models, not just Claude.',
              },
              {
                href: '/for/developers',
                anchor: 'Claude Chrome extension for developers',
                context: 'code review, debugging and documentation workflows from the side panel.',
              },
              {
                href: '/for/students',
                anchor: 'Claude Chrome extension for students',
                context: 'study, research and note-taking workflows on a near-zero budget.',
              },
              {
                href: '/use-cases/research',
                anchor: 'Using Claude for web research',
                context: 'multi-tab research and structured extraction with the accessibility tree.',
              },
              {
                href: '/integrations/github',
                anchor: 'Claude on GitHub',
                context: 'reviewing pull requests and reading diffs without leaving the tab.',
              },
            ]}
          />

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

      <InstallCta
        title="Get Claude AI in Your Browser"
        description="Install Prophet for Claude Haiku, Sonnet, and Opus with browser automation. Free plan available."
      />

      <Footer />
    </main>
  )
}
