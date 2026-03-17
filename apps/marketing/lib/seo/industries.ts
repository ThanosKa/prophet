import type { IndustryData } from './shared'

export const industries: IndustryData[] = [
  {
    slug: 'ecommerce',
    title: 'Prophet AI for E-Commerce',
    keyword: 'AI Chrome extension for ecommerce',
    h1: 'Prophet AI for E-Commerce Teams',
    description: 'Streamline your e-commerce operations with Prophet AI. Write product descriptions, manage listings, analyze competitors, and handle customer communications from your browser.',
    challenges: [
      'Writing unique product descriptions at scale across hundreds or thousands of SKUs',
      'Monitoring competitor pricing and product listings across multiple platforms',
      'Responding to customer reviews and inquiries quickly and professionally',
      'Keeping product data consistent across Shopify, Amazon, and other marketplaces',
    ],
    workflows: [
      { title: 'Product Listing Optimization', description: 'Open a product page, ask Prophet to analyze the title, description, and tags. Get AI-generated improvements optimized for search visibility and conversion, then apply them directly through browser automation.' },
      { title: 'Competitor Price Monitoring', description: 'Navigate to a competitor product page and ask Prophet to extract the price, shipping details, and promotional offers. Build comparison data across multiple competitor sites in a single session.' },
      { title: 'Customer Review Management', description: 'Open your review dashboard, read through customer feedback with Prophet, and generate professional, personalized responses that address each customer concern.' },
    ],
    relatedProfessions: ['marketing-agencies', 'consulting'],
    relatedUseCases: ['compare-products', 'extract-data', 'write-emails-faster'],
  },
  {
    slug: 'saas',
    title: 'Prophet AI for SaaS Companies',
    keyword: 'AI Chrome extension for SaaS',
    h1: 'Prophet AI for SaaS Teams',
    description: 'Accelerate SaaS development and operations with Prophet AI. Review code, manage tickets, draft documentation, and streamline customer support from the browser.',
    challenges: [
      'Keeping up with code reviews across multiple repositories and pull requests',
      'Writing and maintaining technical documentation alongside rapid development cycles',
      'Managing support tickets and customer feature requests efficiently',
      'Onboarding new team members to complex codebases and workflows',
    ],
    workflows: [
      { title: 'Code Review Acceleration', description: 'Open a pull request on GitHub, ask Prophet to summarize the changes, identify potential issues, and draft review comments. Cut review time from hours to minutes on large PRs.' },
      { title: 'Support Ticket Triage', description: 'Open your support dashboard (Zendesk, Intercom, or any web-based tool), have Prophet read the ticket context, and draft a technical response that addresses the customer issue with step-by-step instructions.' },
      { title: 'Documentation Drafting', description: 'Navigate to your docs platform (Notion, Confluence, GitBook) and ask Prophet to draft new documentation pages based on code changes, feature specs, or API endpoints visible in the browser.' },
    ],
    relatedProfessions: ['consulting'],
    relatedUseCases: ['debug-code', 'review-pull-requests', 'research-topics'],
  },
  {
    slug: 'healthcare',
    title: 'Prophet AI for Healthcare',
    keyword: 'AI Chrome extension for healthcare',
    h1: 'Prophet AI for Healthcare Professionals',
    description: 'Support healthcare workflows with Prophet AI. Research medical literature, draft patient communications, summarize clinical guidelines, and manage administrative tasks in the browser.',
    challenges: [
      'Staying current with rapidly evolving medical research and clinical guidelines',
      'Drafting clear patient communications that convey complex medical information',
      'Managing extensive administrative paperwork and documentation requirements',
      'Extracting relevant data from electronic health record web portals',
    ],
    workflows: [
      { title: 'Medical Literature Review', description: 'Open PubMed or a medical journal, ask Prophet to summarize research findings, compare study methodologies, and extract key statistics relevant to your clinical question.' },
      { title: 'Patient Communication Drafting', description: 'Use Prophet to draft patient-friendly explanations of diagnoses, treatment plans, or post-visit instructions. Specify the reading level and language to match your patient population.' },
      { title: 'Administrative Documentation', description: 'Navigate to your EHR web portal and use Prophet to help draft referral letters, prior authorization requests, or clinical notes from structured data on the screen.' },
    ],
    relatedProfessions: ['education', 'consulting'],
    relatedUseCases: ['summarize-articles', 'write-emails-faster', 'research-topics'],
  },
  {
    slug: 'legal',
    title: 'Prophet AI for Legal Professionals',
    keyword: 'AI Chrome extension for legal',
    h1: 'Prophet AI for Legal Professionals',
    description: 'Enhance legal research and document drafting with Prophet AI. Analyze case law, summarize contracts, draft correspondence, and review documents faster from the browser.',
    challenges: [
      'Reviewing lengthy contracts, briefs, and regulatory documents under tight deadlines',
      'Conducting thorough legal research across multiple databases and jurisdictions',
      'Drafting precise legal correspondence that maintains the correct tone and terminology',
      'Extracting and organizing key terms, dates, and obligations from complex agreements',
    ],
    workflows: [
      { title: 'Contract Review Assistance', description: 'Open a contract in your browser-based document viewer. Ask Prophet to identify key clauses, flag unusual terms, summarize obligations for each party, and highlight potential risks.' },
      { title: 'Legal Research Synthesis', description: 'Navigate to legal databases (Westlaw, LexisNexis web portals) and ask Prophet to summarize case holdings, compare precedents, and draft research memos from the content on screen.' },
      { title: 'Client Communication Drafting', description: 'Draft client update emails, engagement letters, or case summaries using Prophet. Specify the level of legal detail appropriate for your audience.' },
    ],
    relatedProfessions: ['consulting', 'finance'],
    relatedUseCases: ['summarize-articles', 'extract-data', 'write-emails-faster'],
  },
  {
    slug: 'finance',
    title: 'Prophet AI for Finance',
    keyword: 'AI Chrome extension for finance',
    h1: 'Prophet AI for Finance Professionals',
    description: 'Streamline financial analysis and reporting with Prophet AI. Analyze market data, draft reports, extract financial metrics, and research investment opportunities from your browser.',
    challenges: [
      'Analyzing financial statements and reports spread across multiple web platforms',
      'Staying current with market news, earnings calls, and regulatory filings',
      'Drafting investment memos and financial reports under time pressure',
      'Extracting and comparing financial metrics across different companies and time periods',
    ],
    workflows: [
      { title: 'Financial Data Extraction', description: 'Open financial statements on SEC EDGAR, Yahoo Finance, or company investor pages. Ask Prophet to extract key metrics (revenue, margins, growth rates) and format them into comparison tables.' },
      { title: 'Market Research Synthesis', description: 'Research market trends across news sites, analyst reports, and industry publications. Have Prophet summarize findings and identify consensus views versus contrarian positions.' },
      { title: 'Report Drafting', description: 'Navigate to your data sources, then ask Prophet to draft investment memos, quarterly reviews, or client reports incorporating the financial data visible on screen.' },
    ],
    relatedProfessions: ['consulting', 'legal'],
    relatedUseCases: ['extract-data', 'summarize-articles', 'compare-products'],
  },
  {
    slug: 'education',
    title: 'Prophet AI for Education',
    keyword: 'AI Chrome extension for education',
    h1: 'Prophet AI for Educators and Students',
    description: 'Transform learning and teaching with Prophet AI. Create lesson plans, research topics, draft assignments, provide feedback on student work, and study more effectively.',
    challenges: [
      'Creating engaging lesson plans and educational materials from scratch',
      'Providing detailed, constructive feedback on student submissions at scale',
      'Researching and synthesizing information across academic sources',
      'Adapting content for different learning levels and accessibility needs',
    ],
    workflows: [
      { title: 'Lesson Plan Generation', description: 'Browse curriculum standards or textbook pages online, then ask Prophet to draft a complete lesson plan with learning objectives, activities, and assessment criteria based on the content.' },
      { title: 'Research and Study Assistance', description: 'Open academic papers, articles, or educational resources. Ask Prophet to summarize key concepts, explain difficult passages, create study guides, or generate practice questions.' },
      { title: 'Feedback and Grading Support', description: 'Open student submissions in your LMS (Canvas, Google Classroom). Use Prophet to draft constructive feedback that identifies strengths, areas for improvement, and specific suggestions.' },
    ],
    relatedProfessions: ['healthcare', 'consulting'],
    relatedUseCases: ['summarize-articles', 'research-topics', 'write-emails-faster'],
  },
  {
    slug: 'marketing-agencies',
    title: 'Prophet AI for Marketing Agencies',
    keyword: 'AI Chrome extension for marketing agencies',
    h1: 'Prophet AI for Marketing Agencies',
    description: 'Scale your marketing agency output with Prophet AI. Draft copy, analyze campaigns, research competitors, create social media content, and manage client deliverables from the browser.',
    challenges: [
      'Producing high volumes of unique content across multiple clients and platforms',
      'Analyzing competitor strategies and campaign performance across different tools',
      'Maintaining brand voice consistency while scaling content production',
      'Managing multiple web-based marketing platforms (Google Ads, Meta, analytics dashboards) simultaneously',
    ],
    workflows: [
      { title: 'Content Production at Scale', description: 'Open a client brief or brand guidelines page, then ask Prophet to generate blog posts, social media copy, ad variations, or email campaigns that match the brand voice and objectives.' },
      { title: 'Competitive Analysis', description: 'Browse competitor websites, social profiles, and ad libraries. Ask Prophet to extract messaging themes, identify positioning differences, and draft competitive analysis reports.' },
      { title: 'Campaign Reporting', description: 'Open analytics dashboards (Google Analytics, Meta Ads Manager). Have Prophet read the data on screen, summarize performance metrics, and draft client-ready reports with insights and recommendations.' },
    ],
    relatedProfessions: ['ecommerce', 'consulting'],
    relatedUseCases: ['write-emails-faster', 'extract-data', 'research-topics'],
  },
  {
    slug: 'consulting',
    title: 'Prophet AI for Consultants',
    keyword: 'AI Chrome extension for consultants',
    h1: 'Prophet AI for Consultants',
    description: 'Deliver faster, higher-quality consulting work with Prophet AI. Research industries, draft deliverables, analyze data, and prepare presentations from your browser.',
    challenges: [
      'Conducting rapid industry research across unfamiliar domains and markets',
      'Drafting polished client deliverables (decks, memos, reports) under tight timelines',
      'Extracting and analyzing data from client web portals and public sources',
      'Managing multiple client workstreams with different platforms and workflows',
    ],
    workflows: [
      { title: 'Industry Deep Dive', description: 'Research a new industry by browsing trade publications, market reports, and company websites. Ask Prophet to synthesize findings into structured industry overviews with key trends, players, and market dynamics.' },
      { title: 'Deliverable Drafting', description: 'Open client requirements or project briefs, then ask Prophet to draft executive summaries, recommendation frameworks, implementation roadmaps, or project status updates.' },
      { title: 'Data-Driven Analysis', description: 'Navigate to data sources (industry databases, public filings, client dashboards). Use Prophet to extract key metrics, build comparison frameworks, and draft data-backed insights for client presentations.' },
    ],
    relatedProfessions: ['finance', 'legal', 'marketing-agencies'],
    relatedUseCases: ['research-topics', 'extract-data', 'summarize-articles'],
  },
]

export function getIndustryBySlug(slug: string): IndustryData | undefined {
  return industries.find((i) => i.slug === slug)
}

export function getAllIndustrySlugs(): string[] {
  return industries.map((i) => i.slug)
}
