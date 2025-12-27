# Prophet - AI-Powered Chrome Extension SaaS

## Project Overview

Chrome side panel extension with streaming AI chat, secure backend API, and marketing landing page. Token-based credit system for SaaS monetization.

**Architecture**: Monorepo with 4 applications

- `apps/sidepanel` - Chrome extension (Vite + React 18)
- `apps/backend` - API server (Next.js 16 App Router)
- `apps/marketing` - Landing page (Next.js 16)
- `apps/shared` - Shared types, utilities, Zod schemas

**Data Flow**: Extension → Backend API → Anthropic API (streaming) → Extension
**Auth**: Clerk v2.0 handles authentication across web app and Chrome extension
**SaaS Model**: Credits-based billing (1 credit = 1 cent API cost). Free: $0.50, Pro: $11 (+10% bonus), Premium: $35 (+17% bonus), Ultra: $70 (+17% bonus)

## Tech Stack

| App       | Technologies                                                                    |
| --------- | ------------------------------------------------------------------------------- |
| sidepanel | Vite, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, CRXJS |
| backend   | Next.js 16, Drizzle ORM, Supabase, Anthropic SDK, Upstash Redis, Clerk          |
| marketing | Next.js 16, Tailwind, shadcn/ui, Framer Motion, Clerk                           |
| shared    | TypeScript, Zod                                                                 |

## Essential Commands

```bash
# Install
pnpm install

# Development (run in parallel)
pnpm -F @prophet/sidepanel dev      # localhost:5173
pnpm -F @prophet/backend dev        # localhost:3000
pnpm -F @prophet/marketing dev      # localhost:3001

# Build
pnpm -F @prophet/sidepanel build    # → apps/sidepanel/dist
pnpm -F @prophet/backend build
pnpm -F @prophet/marketing build

# Database
pnpm -F @prophet/backend db:generate  # Generate migrations from schema
pnpm -F @prophet/backend db:migrate   # Apply migrations
pnpm -F @prophet/backend db:studio    # Open Drizzle Studio GUI

# Lint
pnpm lint                              # All apps
pnpm -F @prophet/sidepanel lint        # Specific app

# Testing
pnpm -F @prophet/backend test          # Watch mode
pnpm -F @prophet/backend test:run      # Single run
pnpm -F @prophet/backend test:coverage # With coverage
```

## Testing

- **Framework**: Vitest (all apps)
- **Location**: Colocated (`*.test.ts` next to source files)
- **Coverage**: Backend has 27 tests passing
- **Commands**: `pnpm test` (all), `pnpm test:run` (once), `pnpm test:coverage` (with coverage)
- **Skill**: See `.claude/skills/testing/SKILL.md` for comprehensive patterns

## File Structure

```
prophet/
├── apps/
│   ├── sidepanel/          # Chrome extension
│   │   ├── src/
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── store/      # Zustand stores
│   │   │   ├── types/      # TypeScript types
│   │   │   └── lib/        # Utilities
│   │   ├── public/         # Static assets
│   │   └── manifest.json   # Chrome extension manifest
│   ├── backend/            # Next.js API
│   │   ├── app/
│   │   │   └── api/        # API routes
│   │   ├── lib/
│   │   │   └── db/         # Drizzle schema, migrations
│   │   └── types/          # TypeScript types
│   ├── marketing/          # Next.js landing page
│   │   ├── app/            # Pages and layouts
│   │   └── components/     # React components
│   └── shared/             # Shared code
│       ├── types/          # Shared TypeScript types
│       └── utils/          # Shared utilities
├── .claude/
│   ├── docs/               # Detailed documentation
│   └── skills/             # Claude Code coding standards (topic-based)
│       ├── frontend/       # Frontend UX/UI patterns
│       ├── backend/        # Backend API & database patterns
│       ├── stack/          # Stack-specific setup
│       └── typescript-standards/  # Cross-cutting concern
└── CLAUDE.md               # This file
```

## Skills Reference

Detailed coding standards organized by topic in `.claude/skills/`:

- **frontend/** - UX patterns, components, accessibility
- **backend/** - API security, database patterns, streaming, testing
- **stack/** - Next.js, Chrome extension setup
- **typescript-standards/** - Type safety across all code

## Critical Security Rules

- ❌ NEVER expose `ANTHROPIC_API_KEY` to client
- ✅ ALL AI requests proxied through backend
- ✅ ALWAYS validate input with Zod
- ✅ ALWAYS authenticate users
- ✅ ALWAYS verify resource ownership
- ✅ Rate limit by `userId`
- ✅ Use transactions for credit deductions

## Code Comment Standards

**When writing code, Claude should NOT add comments unless the implementation is hard to understand for humans.**

- ✅ DO: Write self-documenting code with clear names
- ✅ DO: Add comments ONLY for complex logic, algorithms, or non-obvious behavior
- ❌ DON'T: Add comments for obvious code (e.g., `const x = 5; // Set x to 5`)
- ❌ DON'T: Add redundant comments that just repeat the code
- ❌ DON'T: Add comments for simple CRUD operations or straightforward logic

## Context7 MCP Integration

**Claude Code has access to context7 MCP server for up-to-date documentation.**

When you need latest docs while coding, Claude will use:

```
mcp__context7__resolve-library-id  # Find library ID
mcp__context7__get-library-docs    # Fetch documentation

Alternative if you cannot find your answers you are looking for, fetch the web
```

**Claude prefers context7 over training cutoff knowledge** for API changes, version-specific syntax, and migration guides.

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
