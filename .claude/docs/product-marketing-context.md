# Prophet -- Product Marketing Context

Foundation document for all marketing content, campaigns, and messaging.

---

## 1. Product Definition

### What Prophet Is

Prophet is a Chrome browser extension that embeds a full AI assistant into your browser's side panel. It connects to Anthropic's Claude models (Haiku 4.5, Sonnet 4.6, Opus 4.6) and gives the AI agent the ability to see, understand, and interact with any web page you have open -- clicking buttons, filling forms, navigating sites, and extracting content -- all while you stay in control.

### What It Does

Prophet operates in two modes:

1. **Conversational AI** -- Chat with Claude directly from any tab. Ask questions, get writing help, analyze content, brainstorm. Standard AI chat, but always one click away in the side panel.

2. **Browser Automation Agent** -- Give Prophet a task ("fill out this form", "search for X on this page", "navigate to my account settings and find my billing date") and the AI agent autonomously observes the page via the accessibility tree, decides which actions to take, and executes them using the Chrome DevTools Protocol. It can click, type, scroll, navigate, manage tabs, and wait for dynamic content -- up to 10 tool calls per conversation turn.

### How It Works (Technical Differentiator)

Prophet uses the **accessibility tree** (the same structured data screen readers use) instead of screenshots to understand web pages. Each interactive element gets a unique identifier (UID), and the agent targets elements deterministically rather than guessing at pixel coordinates.

**Architecture flow:**
1. User sends message in side panel
2. Extension captures the current page's accessibility tree snapshot
3. Request is sent to Prophet's backend API (Next.js on prophetchrome.com)
4. Backend authenticates, rate-limits, and proxies to the Anthropic API with streaming
5. Claude responds with text and/or tool calls (click, fill, navigate, etc.)
6. Extension executes tool calls locally in the user's browser via Chrome DevTools Protocol
7. Tool results are sent back to Claude for the next decision
8. Loop continues until the task is complete

**Key architectural choices:**
- Tool execution happens **client-side** in the user's own logged-in browser session -- the backend never sees page content
- Accessibility tree approach is faster, cheaper (fewer tokens), and more deterministic than screenshot-based alternatives
- Streaming responses for real-time feedback
- Credits-based billing with transparent per-token pricing

---

## 2. Target Audience

### Primary Persona: The Productivity-Obsessed Knowledge Worker

**Demographics:** 25-45, works primarily in a browser (SaaS tools, email, research, docs). Roles include product managers, marketers, analysts, consultants, researchers, content creators, developers.

**Psychographics:** Values efficiency. Already uses 5+ browser tabs at any time. Has tried ChatGPT or Claude in a separate tab but dislikes context-switching. Pays for tools that save time.

**Pain points:**
- Context-switching between AI chat and actual work costs focus and time
- Copy-pasting content between browser and AI tools is tedious
- Wants AI to actually DO things on web pages, not just talk about them
- Paying $20/month for Claude Pro feels expensive when usage is sporadic
- Doesn't want to learn complex automation tools (Zapier, Selenium) for simple tasks

**Jobs to be done:**
- "Help me summarize this article without leaving the page"
- "Fill out this repetitive form for me"
- "Find the specific information I need on this page"
- "Help me draft a response to this email"
- "Navigate this complex web app and do X"

### Secondary Persona: The Technical Power User / Early Adopter

**Demographics:** 22-40, developer or technical role. Comfortable with Chrome DevTools, familiar with concepts like accessibility trees and browser automation.

**Psychographics:** Seeks novel tools. Appreciates transparent technical architecture. Values open-source ethos (Prophet links to GitHub). Wants control over AI model selection and cost.

**Pain points:**
- Existing browser AI extensions feel like black boxes
- Claude's Computer Use (screenshot-based) is slow and expensive
- Wants to choose between fast/cheap (Haiku) and powerful (Opus) per task
- Dislikes flat subscription pricing when usage varies week to week

**Jobs to be done:**
- "I want an AI that can automate browser workflows I'd normally script"
- "I want to pick the right model for the right task to optimize cost"
- "I want to understand how this tool works under the hood"

### Tertiary Persona: The Casual AI Explorer

**Demographics:** Broad, anyone curious about AI. May have used ChatGPT but nothing more.

**Pain points:**
- AI tools feel intimidating or expensive
- Doesn't want to commit to $20/month just to try AI
- Wants something that "just works" in the browser

**Jobs to be done:**
- "I want to try AI assistance without a big commitment"
- "Help me with occasional tasks without switching apps"

---

## 3. Value Proposition

### Core Value Proposition

**Prophet gives you an AI assistant that lives in your browser and can actually control it -- so you chat, analyze, and automate without ever leaving the page you're on.**

### Supporting Value Propositions

| Pillar | Statement |
|--------|-----------|
| **Always there** | Access Claude from any website through the side panel -- no tab-switching, no copy-paste |
| **AI that acts** | Prophet doesn't just answer questions -- it clicks buttons, fills forms, navigates pages, and completes tasks in your browser |
| **Faster and cheaper** | Accessibility-tree approach uses fewer tokens than screenshot-based tools, making interactions faster and more cost-efficient |
| **You control the cost** | Choose your model (fast Haiku or powerful Opus), choose your plan, and only pay for what you use with transparent per-token pricing |
| **Privacy by design** | Browser automation happens locally in your session -- the backend never sees what you're browsing |
| **Deterministic, not probabilistic** | UID-based element targeting means the agent clicks exactly what it intends to, unlike coordinate-guessing approaches |

---

## 4. Positioning Statement

**For knowledge workers and power users who live in their browser**, Prophet is a **Chrome extension AI assistant** that **combines conversational AI with autonomous browser automation**. Unlike **ChatGPT, Claude.ai, or Claude in Chrome**, Prophet uses the **accessibility tree for fast, deterministic, cost-efficient page interaction** and offers **pay-per-use pricing** so you only pay for what you actually use.

### Category

AI-powered browser automation assistant (Chrome extension)

### Frame of Reference

Prophet sits at the intersection of:
- **AI chat tools** (ChatGPT, Claude.ai, Gemini) -- but embedded in your browser
- **Browser automation** (Playwright, Selenium, Puppeteer) -- but with natural language, not code
- **AI browser extensions** (Claude in Chrome, Merlin, Monica AI) -- but with deterministic automation, not just chat

---

## 5. Competitive Landscape

### Direct Competitors

| Competitor | What They Do | Prophet's Advantage |
|-----------|-------------|-------------------|
| **Claude in Chrome** (Anthropic) | Official Claude extension, screenshot-based Computer Use | Prophet is faster (no vision model), cheaper (text vs images), more deterministic (UIDs vs coordinates) |
| **ChatGPT browser plugins** | Chat-only, no browser control | Prophet can actually interact with and control web pages |
| **Merlin AI / Monica AI** | AI chat sidebar extensions | Prophet has deeper browser automation (18 tools), not just chat overlays |
| **Sider AI** | Multi-model sidebar | Prophet's agent loop and browser automation go far beyond chat |

### Indirect Competitors

| Competitor | What They Do | Prophet's Advantage |
|-----------|-------------|-------------------|
| **Claude.ai / ChatGPT web apps** | AI chat in a separate tab | Prophet eliminates context-switching; lives in your workflow |
| **Playwright MCP** | Developer-focused browser automation via MCP | Prophet requires zero code; same accessibility-tree approach but with natural language |
| **Zapier / Make** | Workflow automation | Prophet handles ad-hoc, on-the-fly tasks; no pre-configuration needed |

### Key Differentiators (Defensible)

1. **Accessibility tree + UID targeting** -- Same approach as Playwright MCP but in a consumer-friendly Chrome extension
2. **Client-side tool execution** -- Privacy-preserving architecture where page content never leaves the browser
3. **Model choice per conversation** -- Haiku for simple tasks, Opus for complex ones; users optimize cost/quality
4. **Pay-per-use credits** -- No flat $20/month; granular pricing from free ($0.20) to heavy usage ($70/month in credits)
5. **Custom agent loop** -- No dependency on Claude Agent SDK; full control over tool execution

---

## 6. Messaging Framework

### Tagline Options

1. **"AI that doesn't just talk. It acts."** -- Emphasizes browser automation as the differentiator
2. **"Your AI assistant, always one panel away."** -- Emphasizes always-available side panel UX
3. **"Chat with AI. Automate your browser."** -- Direct, dual-capability positioning
4. **"AI assistance without leaving the page."** -- Emphasizes zero context-switching
5. **"The browser assistant that actually browses."** -- Playful, highlights that the AI can control the browser
6. **"Claude in your sidebar. Browser control at your fingertips."** -- Combines brand recognition with capability
7. **"Stop switching tabs. Start getting things done."** -- Pain-point driven
8. **"AI-powered browsing. Pay only for what you use."** -- Value + pricing model
9. **"Your browser, upgraded with intelligence."** -- Simple, aspirational
10. **"From chat to action, in one side panel."** -- Captures the full product journey

### Elevator Pitch (30 seconds)

"Prophet is a Chrome extension that puts a Claude AI assistant in your browser's side panel. But it doesn't just chat -- it can actually see and interact with any web page you're on. Tell it to fill out a form, find information, navigate a complex site, or automate repetitive browser tasks, and it does it autonomously. It uses the same accessibility-tree technology as professional browser testing tools, so it's fast, reliable, and costs less than screenshot-based alternatives. Start free, pay per use, and pick the AI model that fits each task."

### Key Messages by Audience

**For the Productivity-Obsessed Knowledge Worker:**
- "Prophet lives in your browser's side panel -- no more copying text into a separate AI tab."
- "Tell it what you need, and it handles the clicking, scrolling, and form-filling for you."
- "Start free with $0.20 in credits. Upgrade only when you're hooked."
- "Your conversations stream in real-time, so you see answers as they're generated."

**For the Technical Power User:**
- "Prophet uses the accessibility tree, not screenshots -- the same approach as Playwright MCP, but with natural language."
- "Choose Haiku for speed, Sonnet for balance, or Opus for maximum capability -- per conversation."
- "18 browser automation tools: snapshot, click, fill, hover, navigate, scroll, tab management, and more."
- "Client-side tool execution via Chrome DevTools Protocol -- your page content never hits our servers."
- "Open source on GitHub. See exactly how it works."

**For the Casual AI Explorer:**
- "Try AI assistance for free -- no credit card, no commitment."
- "Install, sign in, and start chatting in under a minute."
- "Works on any website. Just open the side panel and ask."

**For Investors/Press:**
- "Prophet is building the AI layer for the browser -- combining conversational AI with autonomous browser automation."
- "Our accessibility-tree approach is 3-5x more token-efficient than screenshot-based alternatives, creating a structural cost advantage."
- "Credits-based pricing aligns revenue with value delivered and reduces churn from unused flat subscriptions."

---

## 7. Feature-Benefit Mapping

| Feature | Benefit | Proof Point |
|---------|---------|-------------|
| **Side panel integration** | Access AI without leaving your workflow | Chrome's native side panel API -- always one click away on any site |
| **18 browser automation tools** | AI doesn't just advise; it executes tasks for you | Click, type, scroll, navigate, manage tabs, wait for dynamic content |
| **Accessibility tree observation** | Faster, cheaper, more reliable page understanding | Same approach as Microsoft's Playwright MCP; structured text vs expensive image processing |
| **UID-based element targeting** | Deterministic interactions -- clicks exactly the right element | Each interactive element gets a stable unique ID; no coordinate-guessing |
| **Client-side tool execution** | Your browsing data never leaves your machine | Tools run via Chrome DevTools Protocol in your logged-in session |
| **3 Claude model tiers** | Optimize cost vs capability per task | Haiku 4.5 ($1/$5 per MTok), Sonnet 4.6 ($3/$15), Opus 4.6 ($5/$25) |
| **Streaming responses** | See answers as they generate, not after a loading spinner | Server-sent events from Anthropic API streamed in real-time |
| **Persistent chat history** | Pick up where you left off | Conversations stored in secure database with full message history |
| **Credits-based pricing** | Pay for exactly what you use | 1 credit = 1 cent of API cost; transparent usage tracking in dashboard |
| **Subscription bonus credits** | Rewarded for commitment | Pro: +10% bonus, Premium/Ultra: +17% bonus on credits included |
| **One-time credit top-up ($10)** | Flexibility for variable usage | Buy extra credits anytime without changing your subscription |
| **Tier-based rate limiting** | Fair resource allocation | Free: 5 req/min, Pro: 20, Premium/Ultra: 60 |
| **Secure authentication (Clerk)** | Enterprise-grade account security | OAuth integration, session sync between web and extension |
| **Agent overlay with stop button** | Stay in control during automation | Blue glow border shows agent is active; red stop button cancels instantly |
| **Auto-generated chat titles** | Easy conversation management | AI summarizes your first message into a title |
| **Dark/light theme** | Comfortable in any environment | System preference detection with manual toggle |

---

## 8. Pricing Narrative

### The Philosophy

Prophet's pricing is built on a principle: **you should pay for AI proportional to the value you extract from it.**

Flat subscriptions ($20/month for Claude Pro, $200/month for Claude Max) force users to guess their usage upfront. Light users overpay. Heavy users hit limits. Prophet eliminates this friction with credits that map directly to actual API costs.

### How to Talk About Pricing

**Frame 1: Transparency**
"Every credit equals one cent of actual AI API cost. We add a 20% service fee for infrastructure, and that's it. No hidden charges, no surprise limits."

**Frame 2: Control**
"Pick the model that fits the task. Use Haiku for quick questions (pennies per conversation). Switch to Opus when you need the full power of Claude's best model. You're in charge."

**Frame 3: Low barrier, room to grow**
"Start free with $0.20 in credits -- enough to try Prophet and see the value. When you're ready, $9.99/month gets you $11 in credits with a 10% bonus."

**Frame 4: Bonus as loyalty reward**
"The more you commit, the more you save. Pro subscribers get 10% bonus credits. Premium and Ultra subscribers get 17% more credits than what they pay for."

### Pricing Tier Positioning

| Tier | Monthly Price | Credits Included | Best For | Messaging |
|------|-------------|-----------------|----------|-----------|
| **Free** | $0 | $0.20 | Trial / occasional use | "Try Prophet risk-free" |
| **Pro** | $9.99 | $11 (+10%) | Daily use, individuals | "Best value for daily AI assistance" |
| **Premium** | $29.99 | $35 (+17%) | Power users, professionals | "For professionals who rely on AI daily" (MOST POPULAR) |
| **Ultra** | $59.99 | $70 (+17%) | Heavy use, teams | "Maximum credits for maximum productivity" |
| **Extra Credits** | $10 (one-time) | $10 | Top-up between cycles | "Need more? Buy credits anytime" |

### Objection Handling

**"Why not just use Claude.ai for $20/month?"**
Prophet gives you browser automation and side-panel convenience that Claude.ai doesn't. Plus, if you use less than $20/month worth of AI, Prophet costs less. If you use more, our bonus credits make it competitive.

**"What if I run out of credits?"**
You can buy a $10 one-time top-up anytime, or upgrade your plan. You're never locked out -- just paused until you add credits.

**"How do I know what things cost?"**
Your dashboard shows real-time credit balance and usage history. Every conversation shows token counts. Pick cheaper models (Haiku) for simple tasks to stretch your credits further.

---

## 9. SEO Positioning

### Primary Keywords (High intent, target for homepage and core pages)

- AI Chrome extension
- AI browser assistant
- Claude Chrome extension
- AI sidebar extension
- browser AI assistant
- AI browser automation

### Secondary Keywords (Feature and capability pages)

- Chrome side panel AI
- AI web automation extension
- Claude browser agent
- AI form filler Chrome
- browser task automation AI
- accessibility tree browser automation
- AI assistant Chrome extension free
- pay-per-use AI assistant

### Long-Tail Keywords (Blog content and landing pages)

- "how to use AI in Chrome browser without switching tabs"
- "Chrome extension that controls your browser with AI"
- "alternative to Claude in Chrome extension"
- "AI assistant that fills forms automatically"
- "cheaper alternative to Claude Pro subscription"
- "browser automation without coding"
- "AI Chrome extension with usage-based pricing"
- "best AI sidebar extension for Chrome 2026"
- "Claude Haiku vs Sonnet vs Opus Chrome extension"
- "AI extension that reads web pages"

### Content Pillars for SEO

1. **"AI Browser Automation"** -- How-to guides, use cases, comparisons
2. **"AI Productivity in Chrome"** -- Workflow tips, extension guides, productivity hacks
3. **"AI Pricing and Value"** -- Cost comparisons, usage optimization, model selection guides
4. **"Technical Deep Dives"** -- Accessibility tree explained, CDP architecture, agent loop design

---

## 10. Brand Voice

### Personality

Prophet's voice is **competent, direct, and approachable** -- like a sharp coworker who explains things clearly without being condescending. Technical when talking to technical people. Simple when talking to everyone else.

### Tone Spectrum

| Context | Tone |
|---------|------|
| Homepage / Hero | Confident, concise, energetic |
| How It Works (technical) | Precise, educational, enthusiastic about the architecture |
| Pricing page | Transparent, fair, no-pressure |
| FAQ | Helpful, honest, anticipating concerns |
| Error messages (in-app) | Calm, actionable, never blaming the user |
| Social media | Casual-professional, occasionally witty, never corporate |

### Voice Attributes

- **Clear over clever** -- Say what the product does. Avoid jargon for its own sake.
- **Honest over hype** -- "Faster and cheaper than screenshot-based approaches" is better than "revolutionary AI breakthrough."
- **Specific over vague** -- "18 browser automation tools" is better than "powerful capabilities."
- **Active over passive** -- "Prophet fills the form for you" not "Forms can be filled by the AI."

### Do's

- Lead with what the user gets, not what the product is
- Use concrete numbers (18 tools, 3 models, $0.20 free credits, 10% bonus)
- Reference the accessibility tree advantage when differentiating
- Acknowledge limitations honestly (can't see images, can't solve CAPTCHAs)
- Show the product in action (screenshots, demos, code examples on technical pages)
- Use "you" and "your" -- speak to the user directly

### Don'ts

- Don't claim "revolutionary" or "groundbreaking" -- let the architecture speak for itself
- Don't hide the fact that this is a proxy to Anthropic's Claude -- transparency is a brand value
- Don't use fear-based marketing ("You're losing productivity without AI!")
- Don't promise the agent can do everything -- the 10 tool-call limit and known limitations are features of responsible design
- Don't use emojis in product copy (matches codebase standards)
- Don't compare to competitors by name in negative terms -- show Prophet's approach and let users draw conclusions
- Don't use "AI-powered" as a standalone descriptor -- always pair it with what the AI actually does

### Brand Words (Preferred Vocabulary)

| Use | Avoid |
|-----|-------|
| assistant | copilot / helper |
| side panel | sidebar (Chrome's official term is "side panel") |
| browser automation | RPA / robotic process automation |
| credits / balance | tokens (user-facing; tokens are internal) |
| accessibility tree | a11y tree (unless technical audience) |
| deterministic | guaranteed / foolproof |
| agent | bot |
| task | job / workflow (for individual actions) |

---

## Appendix: Quick Reference Card

**One-liner:** Prophet is a Chrome extension that puts Claude AI in your side panel and lets it control your browser.

**Social bio:** AI assistant in your Chrome side panel. Chat, automate, browse smarter. Pay only for what you use.

**Domain:** prophetchrome.com

**Chrome Web Store:** https://chromewebstore.google.com/detail/prophet/febgdmgcdimmjfkfblbpjmkjfepmfkif

**GitHub:** https://github.com/ThanosKa/prophet

**Social:** X (@KazakisThanos), Discord (discord.gg/2YV53RbS)

**Current social proof (from Hero):** "Join 1,000+ users already using Prophet"

**Models available:** Claude Haiku 4.5, Claude Sonnet 4.6, Claude Opus 4.6

**Extension version:** 1.0.1

**Manifest description:** "Your AI-powered assistant right in your browser"

**SEO meta description:** "Your AI-powered assistant right in your browser. Boost productivity with intelligent web interactions."
