import type { ProfessionData } from './shared'

export const professions: ProfessionData[] = [
  {
    slug: 'developers',
    title: 'Prophet for Developers',
    keyword: 'AI Chrome extension for developers',
    h1: 'Prophet for Developers',
    description:
      'Debug code, generate snippets, review pull requests, and automate repetitive dev tasks directly from your browser side panel with Claude AI.',
    scenarios: [
      {
        title: 'Debugging Stack Traces',
        description:
          'You hit an obscure error in your console. Instead of opening a new tab and pasting logs into a chatbot, you open Prophet in the side panel. It reads the page context, identifies the stack trace, and walks you through the root cause with suggested fixes — all without leaving your editor or browser.',
      },
      {
        title: 'Reviewing Pull Requests',
        description:
          'You are reviewing a teammate\'s pull request on GitHub. Prophet can read the diff visible on screen, flag potential bugs, suggest naming improvements, and highlight missing edge-case handling. You get a second pair of eyes in seconds.',
      },
      {
        title: 'Generating Boilerplate',
        description:
          'Setting up a new API route, test file, or component follows a predictable pattern. Describe what you need and Prophet generates the boilerplate code that matches your project conventions, ready to paste into your editor.',
      },
      {
        title: 'Explaining Unfamiliar Codebases',
        description:
          'You land on an open-source repository and need to understand the architecture fast. Prophet reads the visible code on the page and explains module relationships, data flows, and design patterns in plain language.',
      },
    ],
    relatedUseCases: ['code-review', 'debugging', 'documentation', 'web-scraping'],
    recommendedModel: 'sonnet',
    typicalSessionCost: '$0.02 - $0.08',
  },
  {
    slug: 'students',
    title: 'Prophet for Students',
    keyword: 'AI Chrome extension for students',
    h1: 'Prophet for Students',
    description:
      'Research faster, understand complex topics, summarize articles, and get homework help directly in your browser with Prophet\'s AI side panel.',
    scenarios: [
      {
        title: 'Research Paper Summaries',
        description:
          'You are reading a dense 30-page academic paper in your browser. Prophet reads the visible text and produces a structured summary with key findings, methodology, and conclusions. You save hours of reading time and get straight to the insights that matter for your assignment.',
      },
      {
        title: 'Understanding Complex Concepts',
        description:
          'A lecture slide or textbook chapter uses jargon you do not recognize. Highlight the confusing passage, ask Prophet to explain it, and get a clear breakdown with analogies and examples tailored to your level of understanding.',
      },
      {
        title: 'Citation and Source Checking',
        description:
          'While writing an essay, you need to verify that a claim on a webpage is backed by credible evidence. Prophet analyzes the content on screen, identifies the key claims, and suggests what to look for when evaluating the source.',
      },
      {
        title: 'Exam Preparation',
        description:
          'You are reviewing online study materials before a midterm. Ask Prophet to quiz you on the visible content, generate flashcard-style questions, or restate key points in a way that reinforces memorization.',
      },
    ],
    relatedUseCases: ['summarization', 'research', 'writing-assistance', 'translation'],
    recommendedModel: 'haiku',
    typicalSessionCost: '$0.005 - $0.02',
  },
  {
    slug: 'marketers',
    title: 'Prophet for Marketers',
    keyword: 'AI Chrome extension for marketers',
    h1: 'Prophet for Marketers',
    description:
      'Write ad copy, analyze competitor pages, draft social media posts, and optimize landing pages with AI assistance right in your browser.',
    scenarios: [
      {
        title: 'Competitor Analysis',
        description:
          'You are browsing a competitor\'s landing page. Prophet reads the page structure, headline copy, CTA placement, and value propositions, then delivers a structured breakdown. You walk away with actionable insights for your own campaigns without manually noting every detail.',
      },
      {
        title: 'Ad Copy Variations',
        description:
          'You need five headline variations for a Google Ads campaign. Describe your product and target audience, and Prophet generates options optimized for different emotional triggers — urgency, curiosity, social proof, and benefit-driven messaging.',
      },
      {
        title: 'SEO Content Audits',
        description:
          'Open any blog post or product page, and Prophet can evaluate heading structure, keyword density, meta description quality, and internal linking opportunities. You get an SEO checklist without switching to a separate audit tool.',
      },
      {
        title: 'Social Media Drafting',
        description:
          'You spot an industry article worth sharing. Prophet reads the article content and drafts platform-specific posts for LinkedIn, X, and Instagram — each with the right tone, length, and hashtag strategy for that channel.',
      },
    ],
    relatedUseCases: ['content-creation', 'competitor-analysis', 'seo-optimization', 'social-media'],
    recommendedModel: 'sonnet',
    typicalSessionCost: '$0.01 - $0.05',
  },
  {
    slug: 'writers',
    title: 'Prophet for Writers',
    keyword: 'AI Chrome extension for writers',
    h1: 'Prophet for Writers',
    description:
      'Overcome writer\'s block, edit drafts, brainstorm ideas, and refine your prose with Claude AI accessible from any browser tab.',
    scenarios: [
      {
        title: 'Overcoming Writer\'s Block',
        description:
          'You are staring at a blank Google Doc. Describe your topic and intended audience, and Prophet suggests outlines, opening hooks, and structural approaches. It does not write for you — it gives you the creative nudge to start writing confidently.',
      },
      {
        title: 'Line-by-Line Editing',
        description:
          'Paste a paragraph into the chat or reference visible text on screen. Prophet highlights awkward phrasing, passive voice, redundant words, and unclear transitions. You get editor-level feedback instantly, so you can polish your draft without waiting for peer review.',
      },
      {
        title: 'Tone and Voice Adjustments',
        description:
          'A blog post written casually needs to be adapted for a formal white paper. Prophet can rework the same content to match a different tone — professional, conversational, academic, or persuasive — while preserving your original ideas.',
      },
      {
        title: 'Research While Writing',
        description:
          'Mid-draft, you need a fact or supporting example. Instead of breaking your flow to open a search engine, ask Prophet to provide context on the topic. It delivers concise, relevant background information so you can keep writing.',
      },
    ],
    relatedUseCases: ['writing-assistance', 'content-creation', 'summarization', 'translation'],
    recommendedModel: 'sonnet',
    typicalSessionCost: '$0.02 - $0.06',
  },
  {
    slug: 'researchers',
    title: 'Prophet for Researchers',
    keyword: 'AI Chrome extension for researchers',
    h1: 'Prophet for Researchers',
    description:
      'Analyze papers, extract data from tables, compare findings across sources, and synthesize literature reviews with AI in your browser.',
    scenarios: [
      {
        title: 'Literature Synthesis',
        description:
          'You have multiple journal articles open across browser tabs. Prophet helps you compare findings, identify consensus and contradictions, and organize themes for your literature review. It turns hours of manual comparison into a structured synthesis session.',
      },
      {
        title: 'Data Table Extraction',
        description:
          'A research paper contains a results table embedded in a PDF viewer or HTML page. Prophet reads the visible data and reformats it into a clean structure you can copy into your spreadsheet or analysis tool.',
      },
      {
        title: 'Methodology Critique',
        description:
          'You are peer-reviewing a paper and need to evaluate the methodology section. Prophet identifies potential weaknesses in sample size, control conditions, statistical approaches, and generalizability, giving you a head start on your review.',
      },
      {
        title: 'Grant Proposal Drafting',
        description:
          'Writing a research proposal requires precise language and clear articulation of significance. Prophet helps you draft specific aims, refine your hypothesis statement, and structure your narrative to align with funding agency expectations.',
      },
    ],
    relatedUseCases: ['summarization', 'research', 'data-extraction', 'writing-assistance'],
    recommendedModel: 'opus',
    typicalSessionCost: '$0.05 - $0.15',
  },
  {
    slug: 'designers',
    title: 'Prophet for Designers',
    keyword: 'AI Chrome extension for designers',
    h1: 'Prophet for Designers',
    description:
      'Get UX feedback, generate copy for mockups, analyze design patterns on live sites, and brainstorm creative directions with AI.',
    scenarios: [
      {
        title: 'UX Copy Generation',
        description:
          'You are building a checkout flow in Figma and need microcopy for button labels, error states, and confirmation messages. Describe the interaction and Prophet generates contextual copy that matches common UX writing patterns — concise, clear, and action-oriented.',
      },
      {
        title: 'Design Pattern Analysis',
        description:
          'You are browsing a well-designed SaaS product for inspiration. Prophet reads the page and breaks down the layout structure, color usage, typography hierarchy, spacing patterns, and component choices. You get a structured design audit without manually annotating screenshots.',
      },
      {
        title: 'Accessibility Feedback',
        description:
          'Before handoff, you want to catch accessibility issues early. Prophet can analyze visible page elements and flag contrast concerns, missing labels, tab order problems, and ARIA attribute suggestions based on WCAG guidelines.',
      },
      {
        title: 'Client Presentation Notes',
        description:
          'You need to explain design decisions to stakeholders. Describe your design rationale and Prophet helps you articulate the reasoning behind layout choices, color psychology, and user flow decisions in language non-designers can understand.',
      },
    ],
    relatedUseCases: ['content-creation', 'ux-review', 'accessibility-audit', 'competitor-analysis'],
    recommendedModel: 'sonnet',
    typicalSessionCost: '$0.01 - $0.05',
  },
  {
    slug: 'product-managers',
    title: 'Prophet for Product Managers',
    keyword: 'AI Chrome extension for product managers',
    h1: 'Prophet for Product Managers',
    description:
      'Write PRDs, analyze user feedback, prioritize features, and draft stakeholder updates with AI assistance directly in your browser.',
    scenarios: [
      {
        title: 'PRD Drafting',
        description:
          'You need to write a product requirements document for a new feature. Describe the user problem and business goal, and Prophet generates a structured PRD with user stories, acceptance criteria, success metrics, and edge cases. It gives you a solid first draft to refine with your team.',
      },
      {
        title: 'User Feedback Analysis',
        description:
          'You are reading through app store reviews, support tickets, or survey responses in your browser. Prophet identifies recurring themes, sentiment patterns, and feature requests across the visible feedback, helping you spot trends without building a spreadsheet.',
      },
      {
        title: 'Competitive Feature Mapping',
        description:
          'You are evaluating a competitor\'s product page or changelog. Prophet reads the visible features and pricing, then helps you build a comparison matrix highlighting gaps and opportunities for your own product roadmap.',
      },
      {
        title: 'Sprint Retrospective Summaries',
        description:
          'After a retro meeting, you have notes scattered across a document. Prophet helps you organize observations into actionable categories — what went well, what needs improvement, and specific action items with owners — formatted for your project management tool.',
      },
    ],
    relatedUseCases: ['summarization', 'competitor-analysis', 'writing-assistance', 'data-extraction'],
    recommendedModel: 'sonnet',
    typicalSessionCost: '$0.02 - $0.06',
  },
  {
    slug: 'data-analysts',
    title: 'Prophet for Data Analysts',
    keyword: 'AI Chrome extension for data analysts',
    h1: 'Prophet for Data Analysts',
    description:
      'Write SQL queries, interpret chart data, explain statistical results, and generate analysis summaries with AI in your browser.',
    scenarios: [
      {
        title: 'SQL Query Generation',
        description:
          'You are looking at a database schema in your browser-based admin panel. Describe the data question you need answered, and Prophet generates the SQL query — handling joins, aggregations, window functions, and filtering. It reads the visible schema context to write queries that match your actual table structure.',
      },
      {
        title: 'Chart Interpretation',
        description:
          'Your dashboard shows a chart with an unexpected trend. Prophet can help you articulate what the data is showing, suggest hypotheses for the pattern, and recommend follow-up analyses. You get the narrative behind the numbers.',
      },
      {
        title: 'Data Cleaning Assistance',
        description:
          'You spot inconsistencies in a data table displayed in your browser. Prophet helps you identify the pattern of errors — duplicate entries, formatting mismatches, outlier values — and suggests transformation logic in SQL or Python to clean the dataset.',
      },
      {
        title: 'Stakeholder Report Writing',
        description:
          'You have the numbers but need to communicate them to a non-technical audience. Prophet transforms raw metrics into a clear narrative with context, comparisons, and business implications that executives can act on.',
      },
    ],
    relatedUseCases: ['data-extraction', 'summarization', 'debugging', 'writing-assistance'],
    recommendedModel: 'sonnet',
    typicalSessionCost: '$0.02 - $0.08',
  },
  {
    slug: 'founders',
    title: 'Prophet for Founders',
    keyword: 'AI Chrome extension for founders',
    h1: 'Prophet for Founders',
    description:
      'Draft pitch decks, analyze market data, write investor updates, and move faster on every task with AI assistance in your browser.',
    scenarios: [
      {
        title: 'Pitch Deck Narrative',
        description:
          'You are building a pitch deck in Google Slides. Prophet helps you craft the narrative for each slide — problem statement, market sizing, competitive differentiation, and traction metrics. It ensures your story flows logically and hits the points investors care about most.',
      },
      {
        title: 'Market Research',
        description:
          'You are reading industry reports, competitor blogs, and analyst articles across multiple tabs. Prophet synthesizes the information into market trends, opportunity areas, and risk factors. You get a market landscape summary without building a research spreadsheet from scratch.',
      },
      {
        title: 'Investor Update Emails',
        description:
          'Monthly investor updates require a consistent format with key metrics, milestones, and asks. Prophet drafts the email structure with your data points, ensuring you cover revenue, burn rate, product progress, and upcoming goals in a professional, concise format.',
      },
      {
        title: 'Hiring and Job Descriptions',
        description:
          'You need to write a compelling job posting that attracts strong candidates. Describe the role and your company stage, and Prophet generates a job description with clear responsibilities, requirements, and culture signals tailored for startup hiring.',
      },
    ],
    relatedUseCases: ['writing-assistance', 'competitor-analysis', 'summarization', 'content-creation'],
    recommendedModel: 'sonnet',
    typicalSessionCost: '$0.02 - $0.06',
  },
  {
    slug: 'freelancers',
    title: 'Prophet for Freelancers',
    keyword: 'AI Chrome extension for freelancers',
    h1: 'Prophet for Freelancers',
    description:
      'Write proposals, respond to clients, manage invoices, and handle multiple projects efficiently with AI in your browser side panel.',
    scenarios: [
      {
        title: 'Proposal Writing',
        description:
          'A prospective client posted a project brief on Upwork or a freelance platform. Prophet reads the visible requirements and helps you craft a tailored proposal that addresses their specific needs, demonstrates relevant experience, and proposes a realistic timeline and budget.',
      },
      {
        title: 'Client Communication',
        description:
          'You need to send a project update, request feedback, or negotiate scope changes. Prophet drafts professional emails that maintain the right tone — friendly but clear about deliverables, timelines, and boundaries. You spend less time wordsmithing and more time delivering work.',
      },
      {
        title: 'Contract and Scope Review',
        description:
          'A client sends a contract or scope document. Prophet reads the visible terms and highlights areas that need attention — payment terms, intellectual property clauses, revision limits, and liability language. You catch potential issues before signing.',
      },
      {
        title: 'Portfolio Case Studies',
        description:
          'Turning completed projects into compelling case studies is time-consuming. Describe the project, challenge, and result, and Prophet structures a case study with a problem-solution-outcome narrative that showcases your value to future clients.',
      },
    ],
    relatedUseCases: ['writing-assistance', 'content-creation', 'email-drafting', 'summarization'],
    recommendedModel: 'haiku',
    typicalSessionCost: '$0.005 - $0.03',
  },
  {
    slug: 'sales-professionals',
    title: 'Prophet for Sales Professionals',
    keyword: 'AI Chrome extension for sales professionals',
    h1: 'Prophet for Sales Professionals',
    description:
      'Research prospects, draft outreach emails, prepare for calls, and analyze deal data with AI assistance right in your browser.',
    scenarios: [
      {
        title: 'Prospect Research',
        description:
          'You are on a prospect\'s LinkedIn profile or company website before a call. Prophet reads the visible information and generates a briefing — recent company news, role context, potential pain points, and conversation starters. You walk into every meeting prepared without spending 20 minutes on manual research.',
      },
      {
        title: 'Outreach Email Sequences',
        description:
          'Cold outreach requires personalization at scale. Prophet reads the prospect\'s page context and drafts a personalized first-touch email with a relevant hook, clear value proposition, and a low-friction call to action. You can generate variations for A/B testing in seconds.',
      },
      {
        title: 'Objection Handling Prep',
        description:
          'Before a demo, you anticipate pushback on pricing, implementation time, or competitor features. Prophet helps you draft responses to common objections with data points, case study references, and reframing techniques tailored to your product.',
      },
      {
        title: 'CRM Data Entry Assistance',
        description:
          'After a call, you need to log notes in your browser-based CRM. Describe what happened in the conversation, and Prophet formats structured call notes with next steps, deal stage updates, and follow-up tasks ready to paste into your CRM fields.',
      },
    ],
    relatedUseCases: ['email-drafting', 'competitor-analysis', 'summarization', 'content-creation'],
    recommendedModel: 'haiku',
    typicalSessionCost: '$0.005 - $0.03',
  },
  {
    slug: 'customer-support',
    title: 'Prophet for Customer Support',
    keyword: 'AI Chrome extension for customer support',
    h1: 'Prophet for Customer Support',
    description:
      'Draft responses faster, troubleshoot issues, manage tickets efficiently, and maintain consistent tone across all customer interactions.',
    scenarios: [
      {
        title: 'Ticket Response Drafting',
        description:
          'A customer submits a detailed support ticket visible in your browser-based help desk. Prophet reads the issue, identifies the core problem, and drafts a response that acknowledges the frustration, provides a clear solution, and offers next steps. You review and send in seconds instead of minutes.',
      },
      {
        title: 'Knowledge Base Lookup',
        description:
          'You are on your company\'s internal wiki or knowledge base trying to find the right article for a customer question. Prophet helps you search through visible documentation and synthesize the relevant steps into a customer-friendly answer.',
      },
      {
        title: 'Escalation Summaries',
        description:
          'When a ticket needs to be escalated to engineering or management, you need a concise summary. Prophet reads the conversation thread and produces a structured escalation report with timeline, customer impact, reproduction steps, and recommended priority.',
      },
      {
        title: 'Tone Consistency',
        description:
          'Different agents write in different styles, which creates an inconsistent brand voice. Prophet helps standardize responses by adjusting tone — ensuring every reply is empathetic, professional, and aligned with your company\'s communication guidelines.',
      },
    ],
    relatedUseCases: ['email-drafting', 'writing-assistance', 'summarization', 'troubleshooting'],
    recommendedModel: 'haiku',
    typicalSessionCost: '$0.003 - $0.02',
  },
]

export function getProfession(slug: string): ProfessionData | undefined {
  return professions.find((p) => p.slug === slug)
}
