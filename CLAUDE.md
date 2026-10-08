# Prophet - AI-Powered Chrome Extension SaaS

## Project Overview

Chrome side panel extension with streaming AI chat, secure backend API, and marketing landing page. Token-based credit system for SaaS monetization.

**Architecture**: Monorepo with 3 applications

- `apps/sidepanel` - Chrome extension (Vite + React 18)
- `apps/marketing` - Landing page + API server (Next.js 16 App Router)
- `apps/shared` - Shared types, utilities, Zod schemas

**Data Flow**: Extension → Marketing API → Anthropic API (streaming) → Extension
**Auth**: Clerk handles authentication across web app and Chrome extension
**SaaS Model**: Prepaid credits (1 credit = 1 cent). Each Turn costs Anthropic's cost plus the Margin, rounded up, minimum 1 credit. Plans give price-equal Subscription credits (Pro $10, Premium $30, Ultra $60) that reset each month; the Free grant is a one-time 7 credits; Purchased credits ($10 one-time) never expire. Numbers live in `apps/marketing/lib/pricing.ts`, economics in `.claude/docs/pricing-model.md`; public copy states no Margin percentage

## Tech Stack

| App       | Technologies                                                                    |
| --------- | ------------------------------------------------------------------------------- |
| sidepanel | Vite, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, CRXJS |
| marketing | Next.js 16, Drizzle ORM, Supabase, Anthropic SDK, Upstash Redis, Stripe, Clerk, shadcn/ui, Framer Motion |
| shared    | TypeScript, Zod                                                                 |

## Commands

Package filters are `@prophet/marketing`, `@prophet/sidepanel` and `@prophet/shared`; root scripts in `package.json` fan out with `pnpm -r`.

- Run tests once with `pnpm test:run` (`pnpm test` is Vitest watch mode).
- `pnpm test:agent` curls `/api/agent/chat/dev`, so it needs `pnpm dev:web` running.
- `pnpm -F @prophet/marketing db:seed` / `db:seed:reset` refuse `NODE_ENV=production` but write to whatever `DATABASE_URL` points at; confirm it is not the prod database first.

## Testing

Writing or reviewing tests: read `.claude/skills/testing/SKILL.md` first. Tests are colocated (`*.test.ts` next to the source file).

## Critical Security Rules

- Keep `ANTHROPIC_API_KEY` server-side: every AI request is proxied through the marketing API, never called from the extension or any client bundle.
- ✅ ALWAYS validate input with Zod
- ✅ ALWAYS authenticate users
- ✅ ALWAYS verify resource ownership
- ✅ Rate-limit every API route with `checkRateLimit` (`apps/marketing/lib/ratelimit.ts`)
- ✅ Use transactions for credit deductions

## Code Comments

Comment only non-obvious logic (algorithms, gotchas, the reason behind a choice); let names carry the rest.

## Detailed Documentation

For comprehensive guides, see:

- **Setup**: @.claude/docs/setup.md - Getting started + environment variables
- **Database**: @.claude/docs/database-schema.md - Database schema and relationships
- **Patterns**: @.claude/docs/patterns.md - Key patterns (auth, streaming, rate limiting)
- **Chrome Extension Auth**: @.claude/docs/chrome-extension-auth.md - Chrome extension authentication flow

## Messages for the developer

After finishing a task, briefly state (max 2 sentences): if you used any rule file from .claude/skills/, which rule you used and why, and if you used an MCP server, what content from its response helped.

## Summary instructions

When you are using compact, please focus on test output and code changes
