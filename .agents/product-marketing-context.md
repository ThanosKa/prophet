# Product Marketing Context

*Last updated: 2026-05-04 — auto-drafted from codebase. Review and correct.*

## Product Overview
**One-liner:** The AI Chrome extension that automates your browser, powered by Claude.
**What it does:** Prophet is an open-source Chrome side-panel extension that brings Anthropic's Claude AI (Haiku 4.5, Sonnet 4.6, Opus 4.6) into the browser with real-time streaming chat and 18 built-in browser-automation tools (click, fill, navigate, extract). Unlike screenshot-based browser AI, Prophet reads the **accessibility tree** for faster, deterministic, cheaper interactions.
**Product category:** AI Chrome extension / AI browser sidebar / browser automation agent.
**Product type:** SaaS — Chrome extension + Next.js web app + API backend.
**Business model:** Pay-per-use credits + monthly subscription tiers.
- Free: $0.20 in credits (no card)
- Pro: $9.99/mo → $11 in credits (+10% bonus)
- Premium: $29.99/mo → $35 in credits (+17%)
- Ultra: $59.99/mo → $70 in credits (+17%)
1 credit = 1 cent of actual API cost. All sales final, no refunds.

## Target Audience
**Target companies:** Solo professionals, indie devs, SMB knowledge workers; not enterprise-first.
**Decision-makers:** End-users (self-serve PLG). No procurement loop.
**Primary use case:** Use Claude on the page you're already on, without copy-pasting to claude.ai, and let it actually *do* things (fill forms, extract data, navigate) rather than just chat.
**Jobs to be done:**
- Use Claude (Haiku/Sonnet/Opus) without committing to a $20/mo Anthropic subscription.
- Run multi-step browser tasks (form filling, research, extraction) from a side panel.
- Pay only for what you use, with full visibility into per-message cost.
**Use cases (from `/use-cases`):** research, writing, coding, summarization, translation, email drafting, data analysis, code review, competitive analysis, form filling, brainstorming, documentation.

## Personas
| Persona | Cares about | Challenge | Value we promise |
|---|---|---|---|
| Indie dev / power user | Cost control, model choice, openness | Locked into $20/mo Claude Pro for occasional use | All 3 Claude models, pay-per-use, open source |
| Researcher / analyst | Pulling structured data off the web | Manual copy/paste between tabs | Side panel + accessibility-tree extraction |
| Cost-conscious AI user | Predictable spend per task | Subscriptions waste money in light months | Credits map 1:1 to API cost |

## Problems & Pain Points
**Core problem:** Existing AI browser extensions are either (a) pure chat wrappers that can't act on the page, or (b) screenshot-based agents that are slow and expensive. Claude.ai itself can't see your current tab.
**Why alternatives fall short:**
- claude.ai → no page context, must copy/paste, $20/mo flat
- Anthropic's official "Claude in Chrome" → screenshot/Computer Use is slow + expensive, requires Claude Pro/Team sub
- Monica/Sider/MaxAI → multi-model chat, no real automation
- Harpa → BYOK + monitoring focus, complex, no interactive automation
**What it costs them:** Wasted subscription fees during light months; hours of manual web work that could be one prompt.
**Emotional tension:** "I'm paying $20/mo and barely using it" / "I want Claude to *do* the thing, not just talk about it."

## Competitive Landscape
**Direct:** Claude in Chrome (Anthropic) — first-party but screenshot-based, sub-required, no model choice in UI.
**Direct:** Monica, Sider, MaxAI, Merlin — multi-model chat sidebars, no interactive automation.
**Secondary:** claude.ai web app — no browser integration; user must context-switch.
**Indirect:** Anthropic API direct + custom scripts — requires coding; no chat UI.
**Indirect:** Manual workflows + Grammarly/Notion AI — siloed point tools.

## Differentiation
**Key differentiators:**
- Only sidebar with all 3 Claude tiers (Haiku/Sonnet/Opus) on the free tier
- Accessibility-tree perception (faster, cheaper, more reliable than screenshots)
- 18 real browser tools, not just page reading
- Pay-per-use credits at 1:1 with API cost
- Fully open source (github.com/ThanosKa/prophet)
**Why customers choose us:** Cost transparency + actual automation + Claude-first focus. No other product combines these three.

## Objections
| Objection | Response |
|---|---|
| "Why not just use Claude Pro for $20?" | Pro plan is $9.99 + you get all 3 models + browser automation. Light users save 50%+. |
| "Is browser automation safe?" | Open source, all requests proxied server-side, no training on your data, requires explicit DevTools permission. |
| "Will my credits expire / can I refund?" | All sales final per terms — but free tier lets you fully evaluate before paying. |
| "Claude-only is limiting" | True — but we go deep on Claude rather than shallow on five models. |

**Anti-persona:** Enterprise buyers needing SSO/SOC2/team admin (not built yet); users who need GPT/Gemini in the same tool.

## Switching Dynamics
**Push:** Wasting Claude Pro sub; tired of copy-pasting to claude.ai; screenshot agents are slow.
**Pull:** Pay-per-use; Opus access without sub; "AI that actually clicks the button."
**Habit:** claude.ai bookmark; muscle memory of tab-switching.
**Anxiety:** "Will an open-source extension be safe?" / "Will my credits run out mid-task?"

## Customer Language (verbatim from GSC queries — what people actually search)
- "is claude ai free" / "claude free trial" / "claude pro free"
- "ai sidebar chrome extension" / "ai side panel"
- "best chrome extensions for claude ai 2026"
- "chatgpt vs claude chrome extension"
- "ai chrome extension"
- "claude api pricing"
- "use claude without subscription"
**Words to use:** side panel, browser automation, pay-per-use, accessibility tree, free tier, Claude (not "LLM"), Chrome extension.
**Words to avoid:** "leverage," "synergy," "revolutionary," "AI-powered" (overused), "seamless."

## Brand Voice
**Tone:** Direct, technical-but-accessible, cost-honest. Treat the reader as a competent buyer who hates marketing fluff.
**Style:** Short sentences. Concrete numbers. Real comparison tables. No emoji.
**Personality:** Pragmatic, transparent, builder-friendly, slightly contrarian (re: subscription waste).

## Proof Points
**Metrics to cite:** 18 browser tools; 3 Claude models on free tier; 2-4× faster than screenshot agents; ~50% cheaper per perception step.
**Open source:** github.com/ThanosKa/prophet (verifiable claim).
**Tech credibility:** Anthropic Claude (Haiku 4.5/Sonnet 4.6/Opus 4.6), Chrome DevTools Protocol.

## Goals
**Business goal:** Drive Chrome Web Store installs → free signup → upgrade to Pro/Premium.
**Conversion action:** "Add to Chrome" (CHROME_STORE_URL).
**Current SEO state (GSC last 90d):** 41 clicks / 9.3K impressions / 0.44% sitewide CTR / avg position 17.5. Top opportunity: high-impression blog posts ranking page-1 with ~0% CTR — title/meta CTR problem, not a ranking problem.
