# Prophet - AI-Powered Chrome Extension SaaS

Chrome side panel extension with a streaming AI agent, a secure backend API and a marketing site, sold on prepaid credits.

- `apps/sidepanel` - Chrome extension (Vite + React 18)
- `apps/marketing` - Landing page + API server (Next.js 16 App Router)
- `apps/shared` - Shared types, utilities, Zod schemas

**Data Flow**: Extension → Marketing API → Anthropic API (streaming) → Extension
**Auth**: Clerk, across the web app and the extension

## Commands

Package filters are `@prophet/marketing`, `@prophet/sidepanel` and `@prophet/shared`; root scripts in `package.json` fan out with `pnpm -r`. Run tests once with `pnpm test:run` (`pnpm test` is Vitest watch mode).

## Critical Security Rules

- Keep `ANTHROPIC_API_KEY` server-side: every AI request is proxied through the marketing API, never called from the extension or any client bundle.
- ✅ ALWAYS validate input with Zod
- ✅ ALWAYS authenticate users
- ✅ ALWAYS verify resource ownership
- ✅ Rate-limit every API route with `checkRateLimit` (`apps/marketing/lib/ratelimit.ts`)
- ✅ Use transactions for credit deductions

## Code Comments

Comment only non-obvious logic (algorithms, gotchas, the reason behind a choice); let names carry the rest.

## Before working on

- API routes (`apps/marketing/app/api/`), the agent loop, prompt caching, model IDs or credit billing → read `.claude/docs/patterns.md`
- Database schema, migrations or queries → read `.claude/docs/database-schema.md`
- Seeding a database (`db:seed`), local setup, env vars or loading the unpacked extension → read `.claude/docs/setup.md`
- Extension sign-in/sign-out, Clerk config or `/auth-success` → read `.claude/docs/chrome-extension-auth.md`
- Running the agent without spending credits (sidepanel mock/dev modes, `pnpm test:agent`) → read `.claude/docs/MOCK_MODE_GUIDE.md`
- Pricing, tiers or markup → numbers live in `apps/marketing/lib/pricing.ts`; the economics in `.claude/docs/pricing-model.md`
- Marketing copy, SEO pages or blog posts → read `.claude/docs/product-marketing-context.md`

## Messages for the developer

After finishing a task, briefly state (max 2 sentences): if you used any rule file from .claude/skills/, which rule you used and why, and if you used an MCP server, what content from its response helped.

## Summary instructions

When you are using compact, please focus on test output and code changes
