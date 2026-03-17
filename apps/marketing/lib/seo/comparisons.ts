export interface FeatureMatrixEntry {
  feature: string
  prophet: string
  competitor: string
}

export interface ComparisonEntry {
  slug: string
  competitor: string
  h1: string
  description: string
  keyword: string
  featureMatrix: FeatureMatrixEntry[]
  prophetAdvantages: string[]
  competitorAdvantages: string[]
}

export interface AlternativeEntry {
  slug: string
  competitor: string
  h1: string
  description: string
  painPoints: string[]
  solutions: string[]
}

export const comparisons: ComparisonEntry[] = [
  {
    slug: 'prophet-vs-claude-in-chrome',
    competitor: 'Claude in Chrome',
    h1: 'Prophet vs Claude in Chrome: Which Browser AI Extension Is Better?',
    description:
      'Compare Prophet and Claude in Chrome side by side. See how accessibility-tree automation stacks up against Anthropic\'s official screenshot-based extension for speed, cost, and reliability.',
    keyword: 'prophet vs claude in chrome',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree (structured data)', competitor: 'Screenshots (vision model)' },
      { feature: 'Speed', prophet: 'Fast - direct element targeting via UIDs', competitor: 'Slower - screenshot/analyze cycle each step' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits (no subscription required)', competitor: 'Claude Pro/Team/Enterprise subscription' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: '$20/month (Claude Pro)' },
      { feature: 'Browser Automation', prophet: '18 tools via Chrome DevTools Protocol', competitor: 'Computer Use (coordinate-based clicks)' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'Claude Sonnet, Opus (depends on subscription)' },
      { feature: 'Data Privacy', prophet: 'Page content stays local; only messages sent to API', competitor: 'Screenshots sent to Anthropic servers' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'Uses the accessibility tree instead of screenshots, resulting in faster and cheaper interactions with lower token usage',
      'Pay-per-use pricing means you only pay for what you consume rather than committing to a $20+/month subscription',
      'Deterministic element targeting with UIDs instead of probabilistic coordinate-based clicks',
      'Fully open source with transparent architecture and community contributions',
    ],
    competitorAdvantages: [
      'Backed by Anthropic directly with first-party support and seamless integration with existing Claude subscriptions',
      'Can visually interpret complex page layouts, charts, and images that the accessibility tree does not capture',
    ],
  },
  {
    slug: 'prophet-vs-sider',
    competitor: 'Sider',
    h1: 'Prophet vs Sider: AI Sidebar Extensions Compared',
    description:
      'Prophet vs Sider feature comparison. Discover how Prophet\'s pay-per-use model and 18 browser automation tools compare to Sider\'s multi-model sidebar with GPT-4, Gemini, and Claude.',
    keyword: 'prophet vs sider',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree snapshots', competitor: 'Page text extraction' },
      { feature: 'Speed', prophet: 'Fast - structured data, no vision model', competitor: 'Fast for chat; limited automation speed' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits', competitor: 'Monthly subscription tiers' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: 'Free tier with daily limits, Pro from $10/month' },
      { feature: 'Browser Automation', prophet: '18 tools (click, fill, navigate, tab management)', competitor: 'Limited - mainly text selection and summarization' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'GPT-4, Claude, Gemini, and others' },
      { feature: 'Data Privacy', prophet: 'Page content processed locally; messages only to API', competitor: 'Page content sent to multiple third-party AI providers' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'Full browser automation with 18 tools that can click, type, navigate, and manage tabs - not just read page text',
      'Pay-per-use pricing so light users save significantly compared to a flat monthly fee',
      'Open source codebase allows inspection of exactly what data is sent and where',
      'Accessibility tree approach provides deterministic element targeting for reliable automation',
    ],
    competitorAdvantages: [
      'Supports GPT-4, Gemini, and Claude in a single extension, giving users model flexibility',
      'Mature product with a large user base, polished UI, and features like AI reading lists and group chat with multiple models',
    ],
  },
  {
    slug: 'prophet-vs-monica-ai',
    competitor: 'Monica AI',
    h1: 'Prophet vs Monica AI: Browser AI Assistants Compared',
    description:
      'Compare Prophet and Monica AI for browser-based AI assistance. See differences in automation capabilities, pricing models, and AI model access.',
    keyword: 'prophet vs monica ai',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree snapshots', competitor: 'Page text extraction and summarization' },
      { feature: 'Speed', prophet: 'Fast - direct element targeting', competitor: 'Fast for chat, slower for complex page tasks' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits', competitor: 'Daily free queries + subscription plans' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: 'Free with daily limits, Pro from $9.90/month' },
      { feature: 'Browser Automation', prophet: '18 tools via Chrome DevTools Protocol', competitor: 'Page summarization, writing, translation; no deep automation' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'GPT-4, Claude, Gemini, Llama, and more' },
      { feature: 'Data Privacy', prophet: 'Page data stays local; only chat messages leave your machine', competitor: 'Page content processed by multiple third-party providers' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'True browser automation with 18 tools that interact with page elements, not just read and summarize text',
      'Pay only for what you use - no wasted subscription fees during low-usage months',
      'Open source transparency lets you verify exactly what data is collected and transmitted',
      'Focused on Claude models with deep integration rather than spreading thin across many providers',
    ],
    competitorAdvantages: [
      'Broader AI model selection including GPT-4, Gemini, and open-source models in one interface',
      'Built-in writing, translation, and image generation tools that go beyond browser automation',
    ],
  },
  {
    slug: 'prophet-vs-maxai',
    competitor: 'MaxAI',
    h1: 'Prophet vs MaxAI: Which Chrome AI Extension Delivers More Value?',
    description:
      'Prophet vs MaxAI comparison covering browser automation, pricing, AI models, and data privacy. Find out which AI Chrome extension fits your workflow.',
    keyword: 'prophet vs maxai',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree (semantic element data)', competitor: 'Page text extraction with context menu' },
      { feature: 'Speed', prophet: 'Fast - structured snapshots, no vision overhead', competitor: 'Fast for text tasks; no deep page interaction' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits', competitor: 'Free tier + subscription plans' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: 'Free with limits, Pro from $9.99/month' },
      { feature: 'Browser Automation', prophet: '18 tools (click, fill, navigate, scroll, tab management)', competitor: 'Context-menu actions: summarize, explain, translate; no form automation' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'GPT-4, Claude, Gemini, Llama' },
      { feature: 'Data Privacy', prophet: 'Browsing data stays local; only messages sent to API', competitor: 'Selected text sent to third-party model providers' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'Full browser automation that can fill forms, click buttons, and navigate pages - not limited to text selection actions',
      'Pay-per-use means no subscription lock-in and no paying for features you do not use',
      'Open source and auditable - you can verify what data leaves your browser',
      'Accessibility tree approach enables reliable, repeatable automation workflows',
    ],
    competitorAdvantages: [
      'Supports multiple AI providers (GPT-4, Gemini, Llama) in addition to Claude, offering model variety',
      'Quick context-menu integration for instant text actions without opening a side panel',
    ],
  },
  {
    slug: 'prophet-vs-chatgpt-sidebar',
    competitor: 'ChatGPT Sidebar',
    h1: 'Prophet vs ChatGPT Sidebar: Browser AI Extensions Face Off',
    description:
      'Compare Prophet (Claude-powered) with ChatGPT Sidebar (GPT-powered). Detailed comparison of browser automation, pricing, speed, and data privacy.',
    keyword: 'prophet vs chatgpt sidebar',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree snapshots', competitor: 'Page text extraction' },
      { feature: 'Speed', prophet: 'Fast - structured data parsing', competitor: 'Moderate - depends on OpenAI API latency' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits', competitor: 'Free tier + ChatGPT Plus subscription' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: 'Free with limits, Plus $20/month' },
      { feature: 'Browser Automation', prophet: '18 tools via Chrome DevTools Protocol', competitor: 'Text summarization and Q&A; no element interaction' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'GPT-4o, GPT-4, GPT-3.5' },
      { feature: 'Data Privacy', prophet: 'Page content stays on your machine', competitor: 'Page content sent to OpenAI servers' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'Powered by Claude which excels at nuanced reasoning, long documents, and following complex instructions',
      'Genuine browser automation with 18 tools versus text-only sidebar functionality',
      'Pay-per-use pricing is cheaper for moderate users compared to $20/month ChatGPT Plus',
      'Open source with transparent data handling and community-driven development',
    ],
    competitorAdvantages: [
      'Leverages the large ChatGPT ecosystem with broad plugin and integration support',
      'GPT-4o offers fast multimodal capabilities including image understanding in chat',
    ],
  },
  {
    slug: 'prophet-vs-merlin',
    competitor: 'Merlin',
    h1: 'Prophet vs Merlin: AI Chrome Extensions for Productivity',
    description:
      'Prophet vs Merlin comparison. See how Prophet\'s browser automation and pay-per-use pricing compare to Merlin\'s multi-model approach across Chrome, Gmail, and social media.',
    keyword: 'prophet vs merlin',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree (semantic elements)', competitor: 'Page text extraction and summarization' },
      { feature: 'Speed', prophet: 'Fast - direct DOM interaction via UIDs', competitor: 'Fast for chat and summaries' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits', competitor: 'Daily free queries + subscription plans' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: 'Free with daily query limits, Pro from $14.25/month' },
      { feature: 'Browser Automation', prophet: '18 tools (click, type, navigate, scroll, tab management)', competitor: 'Text actions (summarize, reply, rewrite); no form/button automation' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'GPT-4, Claude, Gemini, Llama, Mistral' },
      { feature: 'Data Privacy', prophet: 'Page data stays local; messages only to Anthropic API', competitor: 'Page content processed by multiple third-party AI services' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'Deep browser automation with 18 tools versus Merlin\'s text-focused summarize/reply actions',
      'Pay only for what you use instead of a fixed monthly fee with daily query limits',
      'Fully open source - audit exactly how your data is processed and what is transmitted',
      'Deterministic element targeting through the accessibility tree for reliable automation',
    ],
    competitorAdvantages: [
      'Supports five or more AI model providers in a single interface for maximum flexibility',
      'Pre-built integrations for Gmail, LinkedIn, Twitter, and YouTube with context-aware templates',
    ],
  },
  {
    slug: 'prophet-vs-harpa-ai',
    competitor: 'HARPA AI',
    h1: 'Prophet vs HARPA AI: Browser Automation Extensions Compared',
    description:
      'Prophet vs HARPA AI comparison. Compare accessibility-tree automation with HARPA\'s macro-based approach for web automation, monitoring, and AI chat.',
    keyword: 'prophet vs harpa ai',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree snapshots', competitor: 'Page text extraction + CSS selectors' },
      { feature: 'Speed', prophet: 'Fast - structured semantic data', competitor: 'Fast for macros; slower for AI-driven tasks' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits', competitor: 'Free with BYOK, Pro subscription for premium features' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: 'Free (bring your own API key), Pro from $15/month' },
      { feature: 'Browser Automation', prophet: '18 AI-driven tools via Chrome DevTools Protocol', competitor: 'Macro recorder, page monitoring, web scraping' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'GPT-4, Claude, Gemini (via own API keys)' },
      { feature: 'Data Privacy', prophet: 'Page content processed locally; only chat messages leave browser', competitor: 'BYOK option keeps data between you and the provider directly' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'AI-driven automation where Claude reasons about what to do, versus manually building macros step by step',
      'No need to manage your own API keys - Prophet handles authentication and billing',
      'Accessibility tree approach is more resilient to page layout changes than CSS selectors',
      'Open source project you can fork, modify, and self-host',
    ],
    competitorAdvantages: [
      'BYOK (bring your own key) option means no markup on API costs for power users who want maximum savings',
      'Built-in page monitoring and change detection features for tracking competitor prices, stock alerts, and content updates',
    ],
  },
  {
    slug: 'prophet-vs-copilot',
    competitor: 'Microsoft Copilot',
    h1: 'Prophet vs Microsoft Copilot: Browser AI Assistants Compared',
    description:
      'Compare Prophet and Microsoft Copilot sidebar for Chrome. See how Prophet\'s Claude-powered automation and pay-per-use pricing differ from Copilot\'s GPT-based assistant.',
    keyword: 'prophet vs microsoft copilot',
    featureMatrix: [
      { feature: 'Page Understanding', prophet: 'Accessibility tree (structured element data)', competitor: 'Page text extraction and Bing search integration' },
      { feature: 'Speed', prophet: 'Fast - direct element targeting', competitor: 'Moderate - cloud processing through Microsoft infrastructure' },
      { feature: 'Pricing Model', prophet: 'Pay-per-use credits', competitor: 'Free tier + Copilot Pro subscription' },
      { feature: 'Starting Price', prophet: 'Free ($0.20 credits included)', competitor: 'Free with limits, Pro $20/month' },
      { feature: 'Browser Automation', prophet: '18 tools (click, fill, navigate, scroll, tab management)', competitor: 'No direct browser automation; text-based assistance only' },
      { feature: 'Models Available', prophet: 'Claude Haiku 4.5, Sonnet 4.6, Opus 4.6', competitor: 'GPT-4, GPT-4o (Microsoft-hosted)' },
      { feature: 'Data Privacy', prophet: 'Page data stays local; open source for full transparency', competitor: 'Data processed through Microsoft cloud services' },
      { feature: 'Open Source', prophet: 'Yes - full source on GitHub', competitor: 'No - closed source' },
    ],
    prophetAdvantages: [
      'True browser automation with 18 tools - Copilot is a chat assistant with no ability to interact with page elements',
      'Pay-per-use pricing avoids the $20/month Copilot Pro cost for users who need occasional AI help',
      'Powered by Claude which consistently outperforms GPT-4 on reasoning benchmarks and instruction following',
      'Open source and independent - no vendor lock-in to the Microsoft ecosystem',
    ],
    competitorAdvantages: [
      'Deep integration with Microsoft 365 (Word, Excel, Outlook, Teams) for enterprise productivity workflows',
      'Built-in Bing search with real-time web access for up-to-date answers and citations',
    ],
  },
]

export const alternatives: AlternativeEntry[] = [
  {
    slug: 'sider-alternative',
    competitor: 'Sider',
    h1: 'Looking for a Sider Alternative? Try Prophet',
    description:
      'Prophet is a Sider alternative with pay-per-use pricing, 18 browser automation tools, and open-source transparency. No subscription required to get started.',
    painPoints: [
      'Sider\'s subscription costs add up quickly even during months when you barely use AI assistance',
      'Limited browser automation - Sider reads page text but cannot click buttons, fill forms, or navigate for you',
      'Closed-source extension means you cannot verify what browsing data is collected or shared with third parties',
    ],
    solutions: [
      'Prophet\'s pay-per-use model charges only for the tokens you actually consume, so quiet months cost near zero',
      'Prophet includes 18 browser automation tools that click, type, scroll, navigate, and manage tabs via Chrome DevTools Protocol',
      'Prophet is fully open source on GitHub - audit the code yourself to verify exactly what data leaves your browser',
    ],
  },
  {
    slug: 'monica-ai-alternative',
    competitor: 'Monica AI',
    h1: 'Looking for a Monica AI Alternative? Try Prophet',
    description:
      'Switch from Monica AI to Prophet for genuine browser automation, transparent pay-per-use pricing, and full open-source access. Free to start, no credit card needed.',
    painPoints: [
      'Monica\'s daily query limits on the free tier force you into a subscription before you can properly evaluate the tool',
      'No real browser automation - Monica summarizes and rewrites text but cannot interact with page elements',
      'Data passes through multiple third-party AI providers with limited visibility into how it is processed',
    ],
    solutions: [
      'Prophet gives you $0.20 in free credits with no daily limits - use them whenever and however you want',
      'Prophet\'s 18 automation tools let the AI click buttons, fill forms, navigate pages, and manage tabs on your behalf',
      'Prophet is open source and routes data only through your chosen Claude model via Anthropic\'s API - nothing hidden',
    ],
  },
  {
    slug: 'claude-in-chrome-alternative',
    competitor: 'Claude in Chrome',
    h1: 'Looking for a Claude in Chrome Alternative? Try Prophet',
    description:
      'Prophet is an alternative to Claude in Chrome with faster accessibility-tree automation, pay-per-use pricing, and no $20/month subscription requirement.',
    painPoints: [
      'Claude in Chrome requires a $20+/month Claude Pro subscription just to use browser automation features',
      'Screenshot-based page understanding is slow and expensive - each action requires a full screenshot/analyze cycle',
      'Coordinate-based clicking is probabilistic and can miss targets, especially on dynamic or responsive pages',
    ],
    solutions: [
      'Prophet starts free with $0.20 in credits and uses pay-per-use pricing - no subscription commitment needed',
      'Prophet reads the accessibility tree instead of screenshots, using fewer tokens and delivering results faster',
      'Prophet uses deterministic UID-based element targeting that reliably hits the correct button, link, or input every time',
    ],
  },
  {
    slug: 'maxai-alternative',
    competitor: 'MaxAI',
    h1: 'Looking for a MaxAI Alternative? Try Prophet',
    description:
      'Prophet is a MaxAI alternative with 18 browser automation tools, pay-per-use pricing, and open-source code. Go beyond text actions with real page interaction.',
    painPoints: [
      'MaxAI is limited to context-menu text actions like summarize and explain - it cannot automate multi-step browser tasks',
      'Subscription pricing means paying a flat monthly fee even when your usage is minimal',
      'Closed-source with limited transparency about how selected text and page content are processed by various AI providers',
    ],
    solutions: [
      'Prophet automates entire workflows: fill forms, click buttons, navigate between pages, and manage tabs with 18 built-in tools',
      'Pay-per-use credits mean you spend nothing during weeks you do not use AI, and scale up naturally when you need more',
      'Prophet is open source on GitHub - inspect the code, contribute features, or self-host for complete control',
    ],
  },
  {
    slug: 'merlin-alternative',
    competitor: 'Merlin',
    h1: 'Looking for a Merlin Alternative? Try Prophet',
    description:
      'Prophet is a Merlin alternative offering real browser automation, transparent per-use pricing, and open-source code. No daily query caps.',
    painPoints: [
      'Merlin\'s daily query limits on the free tier and per-query caps on paid plans restrict heavy usage days',
      'Browser interaction is limited to text summarization and reply generation - no ability to automate clicks or form fills',
      'Data flows through five or more third-party AI providers making it difficult to track what is shared where',
    ],
    solutions: [
      'Prophet has no daily query limits - your credit balance is the only constraint and it rolls based on actual usage',
      'Prophet\'s 18 automation tools go beyond text: click elements, fill inputs, scroll pages, and manage browser tabs via CDP',
      'Prophet sends data only to Anthropic\'s API and is open source, so you can verify every data path in the codebase',
    ],
  },
  {
    slug: 'harpa-ai-alternative',
    competitor: 'HARPA AI',
    h1: 'Looking for a HARPA AI Alternative? Try Prophet',
    description:
      'Prophet is a HARPA AI alternative with AI-driven automation instead of manual macros. No API key management needed. Open source and pay-per-use.',
    painPoints: [
      'HARPA\'s macro-based automation requires manual setup of each workflow step, which is time-consuming for new tasks',
      'Bring-your-own-key model means managing API keys, monitoring usage across providers, and handling billing separately',
      'CSS-selector-based automation breaks when websites update their layouts or class names',
    ],
    solutions: [
      'Prophet uses AI-driven automation where you describe what you want in natural language and Claude figures out the steps',
      'Prophet handles all API access and billing through a single account - no API keys to manage or rotate',
      'Prophet targets elements via the accessibility tree and UIDs which are resilient to CSS and layout changes',
    ],
  },
]

export function getComparisonBySlug(slug: string): ComparisonEntry | undefined {
  return comparisons.find((c) => c.slug === slug)
}

export function getAlternativeBySlug(slug: string): AlternativeEntry | undefined {
  return alternatives.find((a) => a.slug === slug)
}
