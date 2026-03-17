export interface UseCaseData {
  slug: string
  title: string
  keyword: string
  h1: string
  description: string
  painPoints: string[]
  features: string[]
  examplePrompts: string[]
  relatedSlugs: string[]
}

export const useCases: UseCaseData[] = [
  {
    slug: 'research',
    title: 'AI Research Assistant in Chrome',
    keyword: 'AI research assistant Chrome extension',
    h1: 'AI-Powered Research Assistant for Chrome',
    description:
      'Speed up online research with Prophet. Summarize articles, extract key data, compare sources, and compile findings directly from your browser side panel.',
    painPoints: [
      'Switching between dozens of tabs while trying to compile research from multiple sources wastes time and breaks focus.',
      'Manually copying and pasting relevant data points from articles, reports, and web pages is tedious and error-prone.',
      'Synthesizing information across different sources requires keeping track of where each fact came from.',
      'Traditional search engines return pages of links but do not help you understand or compare the actual content.',
    ],
    features: [
      'Reads and summarizes the content of any webpage you are viewing, extracting the most relevant information for your research topic.',
      'Compares data across multiple open tabs, highlighting agreements, contradictions, and gaps in your sources.',
      'Extracts structured data like statistics, dates, names, and citations from articles and reports into organized formats.',
      'Maintains context across your entire research session so follow-up questions build on previous findings.',
    ],
    examplePrompts: [
      'Summarize the key findings from this research paper and list any limitations mentioned by the authors.',
      'Extract all statistics and data points from this article and present them in a table.',
      'Compare the arguments in this article with what I read on the previous tab.',
      'What are the three strongest pieces of evidence on this page that support renewable energy adoption?',
      'Find and list all the sources and citations referenced on this page.',
    ],
    relatedSlugs: ['summarization', 'competitive-analysis', 'data-analysis'],
  },
  {
    slug: 'writing',
    title: 'AI Writing Assistant in Chrome',
    keyword: 'AI writing assistant Chrome extension',
    h1: 'AI Writing Assistant for Chrome',
    description:
      'Improve your writing directly in the browser. Prophet helps you draft, edit, and refine content in any text field on any website without switching tabs.',
    painPoints: [
      'Switching to a separate writing tool disrupts your workflow and breaks your creative momentum.',
      'Maintaining a consistent tone and style across different platforms and documents is difficult without real-time guidance.',
      'Writer\'s block stalls progress when you cannot find the right way to start or structure a piece.',
      'Revising drafts for clarity, grammar, and conciseness requires multiple passes and significant effort.',
    ],
    features: [
      'Generates first drafts, outlines, and structured content based on your topic and desired tone, right inside any webpage text field.',
      'Rewrites and refines existing text for clarity, conciseness, or a different audience without leaving the page you are working on.',
      'Adapts writing style to match professional, casual, technical, or creative requirements across different contexts.',
      'Provides real-time suggestions for improving sentence structure, word choice, and overall flow of your content.',
    ],
    examplePrompts: [
      'Rewrite this paragraph to be more concise and professional while keeping the main points.',
      'Draft a 300-word blog introduction about the benefits of remote work.',
      'Help me structure an outline for an article about machine learning in healthcare.',
      'Make this text more engaging for a general audience while keeping the technical accuracy.',
      'Write three different versions of this product description targeting different customer segments.',
    ],
    relatedSlugs: ['email-drafting', 'content-creation', 'proofreading'],
  },
  {
    slug: 'coding',
    title: 'AI Coding Assistant in Chrome',
    keyword: 'AI coding assistant Chrome extension',
    h1: 'AI Coding Assistant for Chrome',
    description:
      'Get coding help while browsing documentation, Stack Overflow, or GitHub. Prophet explains code, suggests fixes, and generates snippets from your browser side panel.',
    painPoints: [
      'Browsing documentation and Stack Overflow while coding requires constant tab switching between your editor and the browser.',
      'Understanding unfamiliar codebases or libraries means reading through lengthy documentation without targeted guidance.',
      'Debugging errors often involves searching for solutions across multiple forums without knowing which answer applies to your specific case.',
      'Converting code examples from documentation into your project\'s language or framework takes manual effort.',
    ],
    features: [
      'Reads and explains code snippets on any webpage, breaking down complex logic into understandable steps.',
      'Generates code based on documentation you are viewing, adapting examples to your specific language and framework.',
      'Analyzes error messages and Stack Overflow threads to provide targeted solutions relevant to your codebase.',
      'Extracts and adapts code samples from GitHub repositories, tutorials, and API documentation.',
    ],
    examplePrompts: [
      'Explain this code snippet line by line and identify any potential bugs.',
      'Convert this Python example from the documentation into TypeScript with proper type annotations.',
      'Based on this API documentation, generate a complete fetch request with error handling.',
      'What does this regular expression do, and how would I modify it to also match email addresses?',
      'Summarize the key changes in this GitHub pull request and explain their impact.',
    ],
    relatedSlugs: ['code-review', 'documentation', 'research'],
  },
  {
    slug: 'studying',
    title: 'AI Study Assistant in Chrome',
    keyword: 'AI study assistant Chrome extension',
    h1: 'AI Study Assistant for Chrome',
    description:
      'Study smarter with Prophet. Turn any webpage into a learning session with AI-generated explanations, flashcards, and practice questions from your browser.',
    painPoints: [
      'Online course materials and textbook chapters contain dense information that is hard to absorb in a single reading.',
      'Creating study notes and flashcards from web-based learning materials is a manual and time-consuming process.',
      'Understanding complex topics often requires explanations at different levels, which static content cannot provide.',
      'Self-testing on material you just read requires finding or creating practice questions, which takes time away from actual studying.',
    ],
    features: [
      'Breaks down complex topics on any webpage into simpler explanations tailored to your current understanding level.',
      'Generates flashcards, practice questions, and quizzes from the content of any article, textbook chapter, or course page.',
      'Provides step-by-step explanations for mathematical formulas, scientific concepts, and technical processes found on web pages.',
      'Creates structured study summaries that highlight key terms, concepts, and relationships from lengthy learning materials.',
    ],
    examplePrompts: [
      'Create 10 flashcards from the key concepts on this page with questions on one side and answers on the other.',
      'Explain this concept as if I am a beginner with no prior knowledge of the subject.',
      'Generate 5 multiple-choice practice questions based on this chapter summary.',
      'Summarize this lecture transcript into bullet points organized by topic.',
      'What are the most important formulas on this page, and when would I use each one?',
    ],
    relatedSlugs: ['research', 'summarization', 'translation'],
  },
  {
    slug: 'email-drafting',
    title: 'AI Email Drafting Assistant in Chrome',
    keyword: 'AI email drafting Chrome extension',
    h1: 'AI Email Drafting Assistant for Chrome',
    description:
      'Draft professional emails faster with Prophet. Compose, reply, and refine emails in Gmail, Outlook, or any webmail client without leaving your inbox.',
    painPoints: [
      'Crafting professional emails that strike the right tone takes far longer than it should, especially for sensitive communications.',
      'Replying to lengthy email threads requires re-reading the entire conversation to write an appropriate and complete response.',
      'Translating complex technical information into clear, non-technical language for stakeholders is a recurring challenge.',
      'Following up on multiple conversations while maintaining personalization and context for each recipient is overwhelming.',
    ],
    features: [
      'Drafts complete email responses by reading the current thread in your webmail client and generating contextually appropriate replies.',
      'Adjusts tone and formality to match the relationship with the recipient, from casual team messages to formal client communications.',
      'Summarizes long email threads so you can quickly understand the conversation before composing your reply.',
      'Generates follow-up emails, meeting invitations, and thank-you notes based on the context of your recent correspondence.',
    ],
    examplePrompts: [
      'Draft a polite but firm follow-up email for a project deadline that was missed last week.',
      'Summarize this email thread and draft a response that addresses all three questions asked.',
      'Rewrite this email to sound more professional and diplomatic while keeping the same core message.',
      'Write a thank-you email to the client referencing the key points we discussed in the meeting summary above.',
      'Create a concise status update email for my team based on the project dashboard I am viewing.',
    ],
    relatedSlugs: ['writing', 'proofreading', 'content-creation'],
  },
  {
    slug: 'content-creation',
    title: 'AI Content Creation Assistant in Chrome',
    keyword: 'AI content creation Chrome extension',
    h1: 'AI Content Creation Assistant for Chrome',
    description:
      'Create social media posts, marketing copy, and blog content directly from your browser. Prophet helps you generate and refine content on any platform.',
    painPoints: [
      'Creating consistent content across multiple social media platforms requires adapting the same message to different formats and character limits.',
      'Generating fresh ideas for blog posts, newsletters, and marketing campaigns on a regular schedule leads to creative fatigue.',
      'Repurposing existing content into new formats like turning a blog post into social media threads takes significant manual effort.',
      'Writing compelling headlines, CTAs, and meta descriptions that drive engagement requires specialized copywriting skills.',
    ],
    features: [
      'Generates platform-specific content for Twitter, LinkedIn, Instagram, and other platforms directly while you are on those sites.',
      'Repurposes long-form content into multiple formats including social posts, email snippets, and ad copy from any webpage.',
      'Creates SEO-optimized headlines, descriptions, and meta tags based on the content you are viewing or creating.',
      'Suggests content ideas and angles by analyzing trending topics and competitor content visible on your screen.',
    ],
    examplePrompts: [
      'Turn this blog post into a Twitter thread with 5 tweets that capture the key insights.',
      'Write a LinkedIn post promoting this article with a professional tone and a call to action.',
      'Generate 5 headline variations for this article that would perform well on social media.',
      'Create an Instagram caption for this product page with relevant hashtags.',
      'Write a short newsletter intro based on the three articles I have open in my tabs.',
    ],
    relatedSlugs: ['writing', 'email-drafting', 'brainstorming'],
  },
  {
    slug: 'data-analysis',
    title: 'AI Data Analysis Assistant in Chrome',
    keyword: 'AI data analysis Chrome extension',
    h1: 'AI Data Analysis Assistant for Chrome',
    description:
      'Analyze data on any webpage with Prophet. Extract tables, interpret charts, identify trends, and get insights from dashboards without exporting to spreadsheets.',
    painPoints: [
      'Data presented in web dashboards, reports, and tables requires manual export and reformatting before you can analyze it.',
      'Identifying trends and patterns across multiple data visualizations on a page requires domain expertise and careful observation.',
      'Comparing metrics from different web-based reporting tools means copying numbers into a spreadsheet for side-by-side analysis.',
      'Understanding what the data means and what actions to take from it requires interpretation skills that go beyond just reading numbers.',
    ],
    features: [
      'Extracts and interprets data from tables, charts, and dashboards visible on any webpage without requiring data export.',
      'Identifies trends, outliers, and patterns in data presented on web pages and explains their significance in plain language.',
      'Compares data points across different sections of a page or across multiple tabs to surface meaningful differences.',
      'Generates summaries and actionable insights from analytics dashboards, financial reports, and data-heavy web pages.',
    ],
    examplePrompts: [
      'Extract all the data from this table and calculate the average, median, and growth rate for each column.',
      'What trends do you see in this analytics dashboard, and what might be causing the dip in Q3?',
      'Compare the revenue figures on this page with the targets shown in the previous tab.',
      'Summarize the key takeaways from this quarterly report and highlight any metrics that need attention.',
      'Convert this data table into a format I can paste into a spreadsheet.',
    ],
    relatedSlugs: ['research', 'competitive-analysis', 'summarization'],
  },
  {
    slug: 'form-filling',
    title: 'AI Form Filling Assistant in Chrome',
    keyword: 'AI form filling Chrome extension',
    h1: 'AI Form Filling Assistant for Chrome',
    description:
      'Automate tedious form filling with Prophet. The AI agent can read, understand, and fill out web forms on any site using browser automation tools.',
    painPoints: [
      'Filling out repetitive online forms with the same information across different websites is a monotonous time drain.',
      'Complex application forms with dozens of fields require careful attention to ensure every field is completed correctly.',
      'Job applications, government forms, and insurance paperwork often ask for the same information in slightly different formats.',
      'Reviewing and correcting auto-filled data that browser password managers get wrong takes almost as long as filling the form manually.',
    ],
    features: [
      'Uses browser automation to read form fields and fill them with appropriate content based on your instructions.',
      'Understands form context and field labels to populate the correct information in each input, dropdown, and checkbox.',
      'Navigates multi-step forms by clicking through pages and filling each step sequentially using the agent loop.',
      'Reviews completed forms before submission, allowing you to verify all entries and make corrections.',
    ],
    examplePrompts: [
      'Fill out this contact form with my name John Smith, email john@example.com, and a professional inquiry message.',
      'Complete this job application form with the information from my resume summary.',
      'Navigate through this multi-page registration form and fill in all required fields.',
      'Review this completed form and check if any required fields are missing or incorrectly filled.',
      'Fill out the shipping address section with my standard delivery address.',
    ],
    relatedSlugs: ['email-drafting', 'writing', 'data-analysis'],
  },
  {
    slug: 'summarization',
    title: 'AI Summarization Tool in Chrome',
    keyword: 'AI summarization Chrome extension',
    h1: 'AI Summarization Tool for Chrome',
    description:
      'Instantly summarize any webpage, article, or document with Prophet. Get key points, TL;DR summaries, and structured overviews from your browser side panel.',
    painPoints: [
      'Long articles, research papers, and reports take significant time to read when you only need the key takeaways.',
      'News feeds and content aggregators present dozens of articles daily, making it impossible to read everything thoroughly.',
      'Meeting notes, legal documents, and policy pages contain critical information buried in pages of dense text.',
      'Sharing relevant information with colleagues requires manually distilling lengthy content into brief, actionable summaries.',
    ],
    features: [
      'Generates concise summaries of any webpage content at adjustable lengths, from one-sentence TL;DRs to detailed multi-paragraph overviews.',
      'Extracts and organizes key points, action items, and decisions from meeting notes, reports, and lengthy documents.',
      'Creates structured summaries with headers, bullet points, and categorized information for easy scanning.',
      'Preserves the most important context and nuance when condensing long-form content, avoiding oversimplification.',
    ],
    examplePrompts: [
      'Give me a 3-sentence summary of this article focusing on the main argument and conclusion.',
      'List the 5 most important points from this page in order of significance.',
      'Summarize this terms of service page and highlight anything unusual or concerning.',
      'Create a bullet-point summary of this meeting transcript with action items separated out.',
      'What is this 5000-word article about in one paragraph?',
    ],
    relatedSlugs: ['research', 'studying', 'data-analysis'],
  },
  {
    slug: 'code-review',
    title: 'AI Code Review Assistant in Chrome',
    keyword: 'AI code review Chrome extension',
    h1: 'AI Code Review Assistant for Chrome',
    description:
      'Review pull requests and code changes faster with Prophet. Get AI-powered analysis of diffs, security checks, and improvement suggestions on GitHub and GitLab.',
    painPoints: [
      'Reviewing large pull requests with hundreds of changed files requires hours of focused attention to catch subtle bugs.',
      'Identifying security vulnerabilities, performance issues, and edge cases in code diffs demands deep expertise across multiple domains.',
      'Providing constructive and specific code review feedback takes time to formulate, especially for junior team members\' contributions.',
      'Keeping up with a steady stream of pull requests while maintaining code quality standards leads to review bottlenecks.',
    ],
    features: [
      'Analyzes code diffs on GitHub, GitLab, and Bitbucket to identify potential bugs, security issues, and performance problems.',
      'Suggests specific improvements with refactored code examples rather than just pointing out problems.',
      'Checks for common anti-patterns, missing error handling, and inconsistencies with coding standards visible in the codebase.',
      'Generates structured review comments that are constructive, specific, and actionable for the pull request author.',
    ],
    examplePrompts: [
      'Review this pull request diff and list any potential bugs or security issues you find.',
      'What edge cases might this code change miss? Suggest additional test cases.',
      'Refactor this function to improve readability and suggest a cleaner approach.',
      'Check this code for SQL injection, XSS, and other common security vulnerabilities.',
      'Write a constructive code review comment for this change explaining why the current approach might cause issues.',
    ],
    relatedSlugs: ['coding', 'documentation', 'research'],
  },
  {
    slug: 'translation',
    title: 'AI Translation Assistant in Chrome',
    keyword: 'AI translation Chrome extension',
    h1: 'AI Translation Assistant for Chrome',
    description:
      'Translate web pages and text with context-aware AI. Prophet delivers natural, accurate translations that preserve meaning, tone, and cultural nuance.',
    painPoints: [
      'Machine translation tools produce awkward, literal translations that miss idiomatic expressions and cultural context.',
      'Translating technical documents, legal text, or marketing copy requires domain-specific vocabulary that generic translators handle poorly.',
      'Understanding foreign-language web pages in full context requires more than word-by-word translation of individual sentences.',
      'Communicating with international colleagues or clients in their language demands translations that feel natural, not robotic.',
    ],
    features: [
      'Translates entire web pages or selected text with context-aware AI that preserves meaning, tone, and cultural nuances.',
      'Handles specialized vocabulary for technical, legal, medical, and business content with appropriate terminology.',
      'Provides explanations of idioms, cultural references, and context-dependent phrases alongside the translation.',
      'Translates between any language pair supported by Claude, with the ability to adjust formality and register.',
    ],
    examplePrompts: [
      'Translate this article from Japanese to English while preserving the formal business tone.',
      'What does this paragraph mean in context? Provide both a literal and a natural English translation.',
      'Translate this product listing from German to English with appropriate marketing language.',
      'Help me write a response to this email in Spanish with a professional but warm tone.',
      'Explain the cultural context behind this phrase and suggest the best way to express the same idea in English.',
    ],
    relatedSlugs: ['writing', 'proofreading', 'studying'],
  },
  {
    slug: 'proofreading',
    title: 'AI Proofreading Tool in Chrome',
    keyword: 'AI proofreading Chrome extension',
    h1: 'AI Proofreading Tool for Chrome',
    description:
      'Proofread and polish any text on the web with Prophet. Fix grammar, improve clarity, and ensure professional quality directly in your browser.',
    painPoints: [
      'Catching your own grammar mistakes, typos, and awkward phrasing is difficult because your brain auto-corrects familiar text.',
      'Basic spell checkers miss contextual errors, homophones, and stylistic issues that make writing look unprofessional.',
      'Proofreading emails, social media posts, and web content across different platforms requires checking each one individually.',
      'Ensuring consistency in style, terminology, and formatting across a long document requires multiple focused passes.',
    ],
    features: [
      'Identifies and corrects grammar, spelling, punctuation, and style errors with explanations for each suggested change.',
      'Detects issues that basic spell checkers miss, including contextual errors, wordiness, passive voice overuse, and unclear references.',
      'Checks text directly on any webpage, including email composers, CMS editors, social media post boxes, and form fields.',
      'Maintains your original voice and intent while improving technical accuracy and readability.',
    ],
    examplePrompts: [
      'Proofread this text and list every grammar, spelling, and punctuation error you find.',
      'Rewrite this paragraph to fix all errors while keeping my original tone and meaning.',
      'Is this email professional enough to send to a client? Suggest any improvements.',
      'Check this blog post for consistency in tense, voice, and formatting.',
      'Simplify this text to an 8th-grade reading level while preserving all the important information.',
    ],
    relatedSlugs: ['writing', 'email-drafting', 'translation'],
  },
  {
    slug: 'competitive-analysis',
    title: 'AI Competitive Analysis Tool in Chrome',
    keyword: 'AI competitive analysis Chrome extension',
    h1: 'AI Competitive Analysis Tool for Chrome',
    description:
      'Analyze competitor websites with Prophet. Extract pricing, features, positioning, and messaging from any competitor page directly in your browser.',
    painPoints: [
      'Manually visiting and documenting competitor websites for pricing, features, and messaging changes is a recurring time sink.',
      'Comparing your product\'s positioning against multiple competitors requires organizing scattered information from many sources.',
      'Identifying competitive advantages and gaps in the market requires synthesizing data from competitor pages, reviews, and industry reports.',
      'Keeping competitive intelligence up to date means periodically re-checking dozens of competitor web pages for changes.',
    ],
    features: [
      'Extracts and organizes competitor information from any webpage, including pricing tables, feature lists, and marketing messaging.',
      'Compares competitor offerings side by side by analyzing multiple pages you have open, highlighting key differentiators.',
      'Identifies positioning gaps and opportunities by analyzing how competitors describe their products and target audiences.',
      'Generates competitive analysis summaries and battle cards based on the competitor content visible in your browser.',
    ],
    examplePrompts: [
      'Extract the pricing tiers and features from this competitor\'s pricing page and compare them with ours.',
      'What key claims and value propositions is this competitor making on their homepage?',
      'Analyze this competitor\'s landing page and identify strengths and weaknesses in their messaging.',
      'Compare the feature lists from this page and the competitor page I have open in another tab.',
      'Summarize this competitor\'s positioning and suggest how we can differentiate our product.',
    ],
    relatedSlugs: ['research', 'data-analysis', 'content-creation'],
  },
  {
    slug: 'documentation',
    title: 'AI Documentation Assistant in Chrome',
    keyword: 'AI documentation Chrome extension',
    h1: 'AI Documentation Assistant for Chrome',
    description:
      'Write and improve technical documentation faster with Prophet. Generate API docs, user guides, and README files from code and specs in your browser.',
    painPoints: [
      'Writing clear technical documentation is time-consuming and often deprioritized in favor of shipping features.',
      'Keeping documentation in sync with code changes requires reviewing every update and manually updating the corresponding docs.',
      'Explaining complex systems and APIs in a way that is accessible to different audiences demands strong technical writing skills.',
      'Onboarding new team members suffers when documentation is incomplete, outdated, or scattered across multiple locations.',
    ],
    features: [
      'Generates structured documentation from code, API responses, and technical specifications visible in your browser.',
      'Creates user guides, API references, and tutorials based on the source code or documentation pages you are viewing.',
      'Improves existing documentation by identifying gaps, unclear sections, and outdated information on any docs page.',
      'Adapts documentation style and complexity level for different audiences, from developers to end users.',
    ],
    examplePrompts: [
      'Generate API documentation for the endpoints described on this page with request and response examples.',
      'Write a getting-started guide based on this README and the installation steps shown here.',
      'Improve this documentation page by making it clearer and adding examples where concepts are explained without them.',
      'Create a troubleshooting section based on the common issues discussed in this GitHub issues page.',
      'Write inline code comments explaining the complex logic in this code snippet.',
    ],
    relatedSlugs: ['coding', 'writing', 'code-review'],
  },
  {
    slug: 'brainstorming',
    title: 'AI Brainstorming Assistant in Chrome',
    keyword: 'AI brainstorming Chrome extension',
    h1: 'AI Brainstorming Assistant for Chrome',
    description:
      'Generate ideas and explore possibilities with Prophet. Brainstorm names, strategies, solutions, and creative concepts using AI right in your browser.',
    painPoints: [
      'Brainstorming alone lacks the diverse perspectives that make group sessions productive, leading to narrow thinking.',
      'Generating a large volume of ideas quickly is difficult when you are constrained by your own knowledge and experience.',
      'Moving from a vague concept to a structured plan requires exploring multiple angles that are hard to identify without external input.',
      'Creative blocks stall projects when you cannot find fresh approaches to problems you have been thinking about for too long.',
    ],
    features: [
      'Generates diverse ideas and approaches based on content you are viewing, combining your context with broad AI knowledge.',
      'Explores multiple angles and perspectives for any problem, helping you break out of established thinking patterns.',
      'Builds on your initial ideas by expanding, combining, and refining them into more developed concepts.',
      'Creates structured mind maps, pro/con lists, and decision matrices from brainstorming sessions conducted in the side panel.',
    ],
    examplePrompts: [
      'Generate 10 creative name ideas for a startup based on the product description on this page.',
      'What are 5 different approaches we could take to solve the problem described in this article?',
      'Help me brainstorm features for a mobile app targeting the audience described on this market research page.',
      'Create a pros and cons list for each of the three strategies outlined on this page.',
      'What questions should we be asking about this market opportunity that we might not have considered?',
    ],
    relatedSlugs: ['content-creation', 'writing', 'research'],
  },
]

export function getUseCaseBySlug(slug: string): UseCaseData | undefined {
  return useCases.find((uc) => uc.slug === slug)
}

export function getRelatedUseCases(slugs: string[]): UseCaseData[] {
  return slugs
    .map((slug) => useCases.find((uc) => uc.slug === slug))
    .filter((uc): uc is UseCaseData => uc !== undefined)
}
