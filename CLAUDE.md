# Prophet - AI-Powered Chrome Extension SaaS

## Project Overview
Chrome side panel extension with streaming AI chat, secure backend API, and marketing landing page. Token-based credit system for SaaS monetization.

**Architecture**: Monorepo with 4 applications
- `apps/sidepanel` - Chrome extension (Vite + React 18)
- `apps/backend` - API server (Next.js 16 App Router)
- `apps/marketing` - Landing page (Next.js 16)
- `apps/shared` - Shared types, utilities, Zod schemas

**Data Flow**: Extension → Backend API → Anthropic API (streaming) → Extension
**Auth**: Clerk handles authentication, subscription tiers in user metadata
**SaaS Model**: Token-based credits (Free: ~50K tokens, Pro: ~500K, Premium: ~1.5M, Ultra: ~3M)

## Tech Stack
| App | Technologies |
|-----|-------------|
| sidepanel | Vite, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, CRXJS |
| backend | Next.js 16, Drizzle ORM, Supabase, Anthropic SDK, Upstash Redis, Clerk |
| marketing | Next.js 16, Tailwind, shadcn/ui, Framer Motion, Clerk |
| shared | TypeScript, Zod |

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
```

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
│   └── skills/             # Claude Code coding standards (topic-based)
│       ├── frontend/       # Frontend UX/UI patterns
│       │   ├── ux-patterns/
│       │   ├── component-design/
│       │   └── accessibility/
│       ├── backend/        # Backend API & database patterns
│       │   ├── api-security/
│       │   ├── database-patterns/
│       │   └── streaming/
│       ├── stack/          # Stack-specific setup
│       │   ├── nextjs-setup/
│       │   └── chrome-extension/
│       └── typescript-standards/  # Cross-cutting concern
└── CLAUDE.md               # This file
```

## Coding Standards (Claude Code Skills)

**Skills are coding standards, not technology tutorials.** They define HOW to write quality, scalable code and create top-tier user experiences.

Skills are organized by **topic** (frontend, backend, etc.) to make discovery easy:

### Frontend Skills (Creating Great UX)
- **frontend/ux-patterns** - Loading states, error handling, empty states, user feedback. Use when implementing UI that communicates system state.
- **frontend/component-design** - Component composition, variant patterns, naming conventions, state management. Use when creating or refactoring React components.
- **frontend/accessibility** - ARIA labels, keyboard navigation, screen reader support, WCAG compliance. Use when building forms, buttons, or interactive components.

### Backend Skills (API & Database)
- **backend/api-security** - Input validation with Zod, authentication, authorization, rate limiting, error handling. Use when building API routes.
- **backend/database-patterns** - Query optimization, transactions, migrations, N+1 avoidance. Use when writing database queries.
- **backend/streaming** - Server-Sent Events (SSE), Anthropic streaming, token counting. Use when implementing AI streaming features.

### Stack Skills (Setup & Configuration)
- **stack/nextjs-setup** - File organization, Server/Client boundaries, data fetching, caching. Use for Next.js App Router structure.
- **stack/chrome-extension** - Manifest V3, CRXJS setup, side panel configuration. Use for extension setup.

### Cross-Cutting Skills
- **typescript-standards** - Type safety, discriminated unions, Zod type inference, generics. Use in all TypeScript code.
- **skill-creator** - Guide for creating Claude Code skills with proper structure and frontmatter. Use when building new skills.

## How Skills Work

Skills are organized by **topic** (not by technology) to group related best practices:
- **Frontend** contains all patterns for building great user interfaces
- **Backend** contains patterns for secure APIs and efficient databases
- **Stack** contains technology-specific setup guides (minimal, just configuration)
- **TypeScript standards** applies everywhere

When you're writing code, Claude will use the relevant skill to guide decisions. For example:
- Writing a new component? Use **frontend/component-design**
- Showing a loading state? Use **frontend/ux-patterns**
- Building an API route? Use **backend/api-security**
- Querying the database? Use **backend/database-patterns**

All skills reference **official documentation** from context7 MCP - never outdated, always current.

### Quick Reference Rules
- **Components**: PascalCase, named exports, composition over props, variants over booleans (see frontend/component-design)
- **UX**: Skeleton screens not spinners, optimistic updates, error boundaries, graceful degradation (see frontend/ux-patterns)
- **Accessibility**: Semantic HTML first, ARIA labels, keyboard nav, visible focus indicators (see frontend/accessibility)
- **TypeScript**: Strict mode, explicit return types on exports, discriminated unions for state, Zod for runtime validation
- **Server/Client**: Server Components by default, 'use client' only for interactivity, keep boundary low in tree
- **API**: ALWAYS validate with Zod, ALWAYS authenticate, verify resource ownership, rate limit by user
- **Database**: Use relations to avoid N+1, transactions for atomic operations, index frequently queried columns

## Context7 MCP Integration

**Claude Code has access to context7 MCP server for up-to-date documentation.**

When you need latest docs while coding, Claude will use:
```
mcp__context7__resolve-library-id  # Find library ID
mcp__context7__get-library-docs    # Fetch documentation

# Key library IDs:
/crxjs/chrome-extension-tools      - CRXJS
/drizzle-team/drizzle-orm-docs     - Drizzle ORM
/anthropics/anthropic-cookbook     - Anthropic SDK
/websites/ui_shadcn                - shadcn/ui
/websites/nextjs_app               - Next.js App Router
/upstash/ratelimit-js              - Upstash
/clerk/clerk-docs                  - Clerk
```

**Claude prefers context7 over training cutoff knowledge** for API changes, version-specific syntax, and migration guides.

## Database Schema
```typescript
// Core tables (Drizzle + Supabase PostgreSQL)
users {
  id: string              // Clerk user ID
  email: string
  tier: 'free' | 'pro' | 'premium' | 'ultra'
  creditsRemaining: number
  createdAt: timestamp
  updatedAt: timestamp
}

chats {
  id: uuid
  userId: string          // FK → users.id (cascade delete)
  title: string
  createdAt: timestamp
  updatedAt: timestamp
}

messages {
  id: uuid
  chatId: uuid            // FK → chats.id (cascade delete)
  role: 'user' | 'assistant'
  content: text
  inputTokens: number
  outputTokens: number
  createdAt: timestamp
}

usageRecords {
  id: uuid
  userId: string          // FK → users.id
  tokensUsed: number
  model: string
  createdAt: timestamp
}
```

## Key Patterns

### Authentication Flow
```typescript
// Backend API route
import { auth } from '@clerk/nextjs/server'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId))
  })

  if (!chat) return Response.json({ error: 'Not found' }, { status: 404 })
}
```

### Streaming AI Response
```typescript
// Backend API route
const stream = await anthropic.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages: [...],
})

// Track tokens after completion
stream.on('finalMessage', async (message) => {
  const totalTokens = message.usage.input_tokens + message.usage.output_tokens

  await db.transaction(async tx => {
    await tx.update(users)
      .set({ creditsRemaining: sql`${users.creditsRemaining} - ${totalTokens}` })
      .where(eq(users.id, userId))
  })
})

return new Response(stream.toReadableStream(), {
  headers: { 'Content-Type': 'text/event-stream' }
})
```

### Rate Limiting
```typescript
// middleware.ts or API route
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

const { success } = await ratelimit.limit(userId)
if (!success) {
  return Response.json({ error: 'Too many requests' }, { status: 429 })
}
```

## Environment Variables
See [.env.example](.env.example) for complete list:
- `DATABASE_URL` - Supabase PostgreSQL connection
- `ANTHROPIC_API_KEY` - AI API (server-side only, never expose)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret (server-side only)
- `UPSTASH_REDIS_REST_URL` - Redis for rate limiting
- `VITE_API_URL` - Backend URL for extension

## Critical Security Rules
- ❌ NEVER expose `ANTHROPIC_API_KEY` to client
- ✅ ALL AI requests proxied through backend
- ✅ ALWAYS validate input with Zod
- ✅ ALWAYS authenticate users
- ✅ ALWAYS verify resource ownership
- ✅ Rate limit by `userId`
- ✅ Use transactions for credit deductions

## Next Steps for Development
1. Run `pnpm install` to install dependencies
2. Copy `.env.example` to `.env.local` and fill in keys
3. Set up Clerk, Supabase, Anthropic, Upstash accounts
4. Generate and run initial database migration
5. Start building the extension UI

**Reference the Skills in `.claude/skills/` for coding standards while developing.**
