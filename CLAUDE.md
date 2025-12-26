# Prophet - AI-Powered Chrome Extension SaaS

## Project Overview
Chrome side panel extension with streaming AI chat (Claude), secure backend API, and marketing landing page. Token-based credit system for SaaS monetization.

## Architecture
```
prophet/
├── packages/
│   ├── sidepanel/     # Chrome extension (Vite + React 18 + CRXJS)
│   ├── backend/       # API server (Next.js 16 App Router)
│   ├── marketing/     # Landing page (Next.js 16)
│   └── shared/        # Shared types, utils, Zod schemas
```

**Data Flow**: Extension → Backend API → Anthropic API (streaming) → Extension
**Auth Flow**: Clerk handles auth across all packages, subscription tiers in metadata

## Tech Stack
| Package | Stack |
|---------|-------|
| sidepanel | Vite, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, Framer Motion |
| backend | Next.js 16 (App Router), Drizzle ORM, Supabase (PostgreSQL), Anthropic SDK, Upstash Redis |
| marketing | Next.js 16, TypeScript, Tailwind, shadcn/ui, Framer Motion |
| shared | TypeScript, Zod |

## Commands
```bash
# Install all dependencies
pnpm install

# Development
pnpm -F @prophet/sidepanel dev      # Extension dev server (localhost:5173)
pnpm -F @prophet/backend dev        # Backend API (localhost:3000)
pnpm -F @prophet/marketing dev      # Marketing site (localhost:3001)

# Build
pnpm -F @prophet/sidepanel build    # Outputs to packages/sidepanel/dist
pnpm -F @prophet/backend build
pnpm -F @prophet/marketing build

# Lint
pnpm -F @prophet/sidepanel lint
pnpm lint                            # Lint all packages

# Database
pnpm -F @prophet/backend db:generate  # Generate migrations
pnpm -F @prophet/backend db:migrate   # Run migrations
pnpm -F @prophet/backend db:studio    # Open Drizzle Studio
```

## Code Style
- **TypeScript**: Strict mode, explicit return types on exports
- **Components**: Functional only, named exports
- **State**: Zustand for global, TanStack Query for server state
- **Styling**: Tailwind utilities, shadcn/ui components
- **Imports**: Use `@/` alias for src directory
- **Files**: kebab-case for files, PascalCase for components
- **No Prettier**: ESLint handles formatting

## Stack Rules

### Extension (sidepanel)
- CRXJS Vite plugin handles manifest.json and HMR
- Side panel entry in manifest: `"side_panel": { "default_path": "index.html" }`
- All React code is client-side (no "use client" needed)
- Use `@clerk/chrome-extension` for auth
- Store auth token, pass in API requests

### Backend (Next.js 16)
- Server Components by default in app/
- API routes in `app/api/` use route handlers
- Clerk middleware protects routes in `middleware.ts`
- Use `auth()` from `@clerk/nextjs/server` in API routes
- Drizzle for all database operations
- Stream responses with Anthropic SDK

### Database (Drizzle + Supabase)
```typescript
// Core tables
users           // Clerk user sync, subscription tier
chats           // userId, title, createdAt
messages        // chatId, role, content, tokenCount
usage_credits   // userId, tokensUsed, period, tier
```

### Authentication (Clerk)
- Middleware: Protect `/api/*` routes except webhooks
- Extension: `@clerk/chrome-extension` with popup auth flow
- Marketing: `@clerk/nextjs` with sign-in/sign-up pages
- Tiers stored in `user.publicMetadata.tier`

### Streaming (Anthropic API)
```typescript
// Backend API route pattern
const stream = await anthropic.messages.stream({
  model: "claude-sonnet-4-20250514",
  max_tokens: 4096,
  messages: [...],
});

// Return SSE stream to client
return new Response(stream.toReadableStream(), {
  headers: { "Content-Type": "text/event-stream" }
});
```

### Rate Limiting (Upstash)
- Redis-based rate limiting in middleware
- Per-user limits based on tier
- Track token usage after each response

## SaaS Credit System
| Tier | Price | Credits (~tokens) |
|------|-------|-------------------|
| Free | $0 | ~$1 worth (~50K tokens) |
| Pro | $9.99/mo | ~$10 worth (~500K tokens) |
| Premium | $29.99/mo | ~$30 worth (~1.5M tokens) |
| Ultra | $59.99/mo | ~$60 worth (~3M tokens) |

- Track `input_tokens` + `output_tokens` from Anthropic response
- Deduct from user's credit balance after each message
- Block requests when credits exhausted

## shadcn/ui Components
```bash
# Add components (NOT full library install)
pnpm dlx shadcn@latest add button card input -c packages/sidepanel
pnpm dlx shadcn@latest add button card -c packages/marketing
```

## Important Notes
- Never expose `ANTHROPIC_API_KEY` to client
- All AI requests go through backend API
- Extension communicates via fetch to backend
- Use Zod for all API request/response validation

---

## Context7 MCP Server Access

**Claude Code has access to the context7 MCP server for fetching up-to-date documentation.**

When working on this project, use context7 to fetch latest docs instead of relying on training cutoff knowledge:

```
# Available MCP tools:
mcp__context7__resolve-library-id  - Find library ID for a package
mcp__context7__get-library-docs    - Fetch documentation for a library

# Key library IDs for this project:
/crxjs/chrome-extension-tools      - CRXJS Vite plugin docs
/drizzle-team/drizzle-orm-docs     - Drizzle ORM docs
/anthropics/anthropic-cookbook     - Anthropic SDK patterns
/websites/ui_shadcn                - shadcn/ui docs
/upstash/ratelimit-js              - Upstash rate limiting
/clerk/clerk-docs                  - Clerk authentication
```

**Always prefer context7 for:**
- API changes in dependencies
- New patterns and best practices
- Version-specific syntax
- Migration guides
