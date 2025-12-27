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
│   └── skills/             # Claude Code coding standards (topic-based)
│       ├── frontend/       # Frontend UX/UI patterns
│       │   ├── ux-patterns/
│       │   ├── component-design/
│       │   └── accessibility/
│       ├── backend/        # Backend API & database patterns
│       │   ├── api-security/
│       │   └── database-patterns/
│       ├── stack/          # Stack-specific setup
│       │   ├── nextjs-architecture/
│       │   └── chrome-extension/
│       └── typescript-standards/  # Cross-cutting concern
└── CLAUDE.md               # This file
```

## Skills Reference

Detailed coding standards organized by topic in `.claude/skills/`:

- **frontend/** - UX patterns, components, accessibility
- **backend/** - API security, database patterns, streaming, testing
- **stack/** - Next.js, Chrome extension setup
- **typescript-standards/** - Type safety across all code

## Context7 MCP Integration

**Claude Code has access to context7 MCP server for up-to-date documentation.**

When you need latest docs while coding, Claude will use:

```
mcp__context7__resolve-library-id  # Find library ID
mcp__context7__get-library-docs    # Fetch documentation

Alternative if you cannot find your asnwers you are looking for, fetch the web

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
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) return Response.json({ error: "Not found" }, { status: 404 });
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
import { Ratelimit } from "@upstash/ratelimit";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

const { success } = await ratelimit.limit(userId);
if (!success) {
  return Response.json({ error: "Too many requests" }, { status: 429 });
}
```

## Environment Variables

**Monorepo Setup**: Each app has its own `.env.local` with only the variables it needs.

### Root (`.env.local`)

Copy from [.env.example](.env.example) - contains all shared variables:

- `DATABASE_URL` - Supabase PostgreSQL connection
- `ANTHROPIC_API_KEY` - AI API (server-side only)
- `CLERK_SECRET_KEY` - Clerk secret (server-side only)
- `CLERK_WEBHOOK_SECRET` - Clerk webhooks
- `UPSTASH_REDIS_REST_URL` - Redis for rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `VITE_API_URL` - Backend URL for extension
- `NEXT_PUBLIC_APP_URL` - Marketing app URL

### apps/backend/.env.local

Copy from [apps/backend/.env.example](apps/backend/.env.example) - backend API needs:

- `DATABASE_URL`, `ANTHROPIC_API_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### apps/marketing/.env.local

Copy from [apps/marketing/.env.example](apps/marketing/.env.example) - marketing site needs:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`

### apps/sidepanel/.env.local

Copy from [apps/sidepanel/.env.example](apps/sidepanel/.env.example) - Chrome extension needs:

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key (Vite prefixed for build-time inlining)
- `VITE_API_URL` - Backend API URL for extension requests

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

**Example - GOOD (no unnecessary comments):**

```typescript
export async function GET(
  req: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(error("Unauthorized", "UNAUTHORIZED"), {
      status: 401,
    });
  }

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) {
    return NextResponse.json(error("Chat not found", "CHAT_NOT_FOUND"), {
      status: 404,
    });
  }

  logger.info({ userId, chatId }, "Chat fetched");
  return NextResponse.json(success(chat));
}
```

**Example - BAD (too many comments):**

```typescript
// Get the authenticated user
const { userId } = await auth();
// Check if user is authenticated
if (!userId) {
  // Return unauthorized error
  return NextResponse.json(error("Unauthorized", "UNAUTHORIZED"), {
    status: 401,
  });
}
```

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Setup External Services

Create accounts and get credentials from:

- **Clerk** - https://dashboard.clerk.com (authentication)
- **Supabase** - https://supabase.com (PostgreSQL database)
- **Anthropic** - https://console.anthropic.com (AI API)
- **Upstash** - https://upstash.com (Redis rate limiting)

### 3. Configure Environment Variables

Each app reads its own `.env.local`:

**Root** - Copy [.env.example](.env.example) → `.env.local`

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

**Backend** - Copy [apps/backend/.env.example](apps/backend/.env.example) → `apps/backend/.env.local`

```bash
cp apps/backend/.env.example apps/backend/.env.local
# Copy your values from root/.env.local
```

**Marketing** - Copy [apps/marketing/.env.example](apps/marketing/.env.example) → `apps/marketing/.env.local`

```bash
cp apps/marketing/.env.example apps/marketing/.env.local
# Copy NEXT_PUBLIC_* values from root/.env.local
```

**Sidepanel** - Copy [apps/sidepanel/.env.example](apps/sidepanel/.env.example) → `apps/sidepanel/.env.local`

```bash
cp apps/sidepanel/.env.example apps/sidepanel/.env.local
# Copy VITE_* values from root/.env.local
```

### 4. Initialize Database

```bash
pnpm -F @prophet/backend db:migrate
```

### 5. Start Development

```bash
# All apps in parallel
pnpm dev

# Or individual apps
pnpm dev:backend      # localhost:3000
pnpm dev:marketing    # localhost:3001
pnpm dev:sidepanel    # localhost:5173 (dev server, builds to dist/)
```

### 6. Load Chrome Extension

After building the sidepanel:

```bash
pnpm -F @prophet/sidepanel build
```

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `apps/sidepanel/dist` folder
5. Click the extension icon to open the sidepanel

## Messages for the developer

After finishing a task, briefly state (max 2 sentences): if you used any rule file from .claude/skills/, which rule you used and why, and if you used an MCP server, what content from its response helped.

# Summary instructions

When you are using compact, please focus on test output and code changes
