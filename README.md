# Prophet - AI-Powered Chrome Extension SaaS

> Chrome side panel extension with streaming AI chat, secure backend API, and marketing landing page. Token-based credit system for SaaS monetization.

## Architecture

Monorepo with 4 applications:
- **`apps/sidepanel`** - Chrome extension (Vite + React 18)
- **`apps/backend`** - API server (Next.js 16 App Router)
- **`apps/marketing`** - Landing page (Next.js 16)
- **`apps/shared`** - Shared types, utilities, Zod schemas

**Data Flow**: Extension → Backend API → Anthropic API (streaming) → Extension
**Auth**: Clerk handles authentication, subscription tiers in user metadata
**SaaS Model**: Token-based credits (Free: ~50K tokens, Pro: ~500K, Premium: ~1.5M, Ultra: ~3M)

---

## Prerequisites

- **Node.js 18+** and **pnpm 8+**
- **Supabase account** (PostgreSQL database)
- **Clerk account** (authentication)
- **Anthropic API key** (AI chat)
- **Upstash account** (Redis rate limiting)
- **Stripe account** (payments - optional for now)

---

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd prophet
pnpm install
```

### 2. Setup External Services

Create accounts and get credentials from:
- [Supabase](https://supabase.com) → PostgreSQL database
- [Clerk](https://dashboard.clerk.com) → Authentication
- [Anthropic](https://console.anthropic.com) → AI API
- [Upstash](https://upstash.com) → Redis rate limiting
- [Stripe](https://dashboard.stripe.com) → Payments (optional)

### 3. Configure Environment Variables

Each app has its own `.env.local`. Start with root:

```bash
# Root .env.local
cp .env.example .env.local
# Edit .env.local with your credentials
```

**Important Supabase Setup:**
- Go to Supabase Dashboard → Settings → Database → Connection String
- **Use "Session Pooler"** (not "Direct connection") to avoid IPv6 issues
- Copy the Session Pooler connection string

```bash
# Example .env.local
DATABASE_URL=postgresql://postgres.YOUR_PROJECT:YOUR_PASSWORD@aws-X-region.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.YOUR_PROJECT:YOUR_PASSWORD@aws-X-region.pooler.supabase.com:5432/postgres
ANTHROPIC_API_KEY=sk-ant-api03-...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Copy to individual apps:**

```bash
cp .env.local apps/backend/.env.local
cp .env.local apps/marketing/.env.local
cp .env.local apps/sidepanel/.env.local
```

### 4. Initialize Database

Generate and run migrations:

```bash
pnpm -F @prophet/backend db:generate  # Generate migrations from schema
pnpm -F @prophet/backend db:migrate   # Apply to Supabase
```

Verify tables created:
- Supabase Dashboard → Table Editor
- Should see: `users`, `chats`, `messages`, `usage_records`

### 5. Run Development Servers

```bash
# All apps in parallel
pnpm dev

# Or individual apps
pnpm dev:backend      # localhost:3000
pnpm dev:marketing    # localhost:3001
pnpm dev:sidepanel    # localhost:5173
```

### 6. Load Chrome Extension (Development)

```bash
pnpm -F @prophet/sidepanel build
```

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `apps/sidepanel/dist` folder
5. Extension icon appears in toolbar

---

## Project Structure

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
│   │   └── manifest.json   # Chrome extension config
│   ├── backend/            # Next.js API
│   │   ├── app/api/        # API routes
│   │   ├── lib/
│   │   │   ├── db/         # Drizzle schema, migrations
│   │   │   ├── logger.ts   # Pino logger
│   │   │   └── stripe.ts   # Stripe client
│   │   └── types/          # TypeScript types
│   ├── marketing/          # Next.js landing page
│   │   ├── app/            # Pages and layouts
│   │   └── components/     # React components
│   └── shared/             # Shared code
│       ├── types/          # Shared TypeScript types
│       └── utils/          # Shared utilities
├── .claude/
│   └── skills/             # Claude Code coding standards
│       ├── frontend/       # Frontend UX/UI patterns
│       ├── backend/        # Backend API & database patterns
│       ├── stack/          # Stack-specific setup
│       └── typescript-standards/
├── CLAUDE.md               # Claude Code project guide
└── README.md               # This file
```

---

## Available Scripts

### Root Commands

```bash
pnpm dev                    # Run all apps in parallel
pnpm dev:backend            # Backend only (localhost:3000)
pnpm dev:marketing          # Marketing only (localhost:3001)
pnpm dev:sidepanel          # Sidepanel only (localhost:5173)

pnpm build                  # Build all apps
pnpm lint                   # Lint all apps
pnpm test                   # Run all tests
pnpm test:run               # Run tests once (no watch)
pnpm test:coverage          # Run tests with coverage
```

### Backend Commands

```bash
pnpm -F @prophet/backend dev              # Dev server
pnpm -F @prophet/backend build            # Production build
pnpm -F @prophet/backend db:generate      # Generate migrations
pnpm -F @prophet/backend db:migrate       # Apply migrations
pnpm -F @prophet/backend db:studio        # Open Drizzle Studio GUI
pnpm -F @prophet/backend test             # Run tests (watch)
pnpm -F @prophet/backend test:run         # Run tests (once)
pnpm -F @prophet/backend test:coverage    # Test coverage
```

### Sidepanel Commands

```bash
pnpm -F @prophet/sidepanel dev    # Dev server (localhost:5173)
pnpm -F @prophet/sidepanel build  # Build to dist/ folder
pnpm -F @prophet/sidepanel lint   # Lint
```

### Marketing Commands

```bash
pnpm -F @prophet/marketing dev    # Dev server (localhost:3001)
pnpm -F @prophet/marketing build  # Production build
pnpm -F @prophet/marketing lint   # Lint
```

---

## Database Management

### Migrations Workflow

```bash
# 1. Modify schema
# Edit: apps/backend/lib/db/schema.ts

# 2. Generate migration
pnpm -F @prophet/backend db:generate

# 3. Review generated SQL
cat apps/backend/lib/db/migrations/XXXX_name.sql

# 4. Apply migration
pnpm -F @prophet/backend db:migrate

# 5. Verify in Drizzle Studio
pnpm -F @prophet/backend db:studio
```

### Database Schema

```
users
├── id (text, PK)               # Clerk user ID
├── email (text)
├── tier (enum)                 # free, pro, premium, ultra
├── credits_remaining (int)
├── stripe_customer_id (text)
└── subscription_status (enum)

chats
├── id (uuid, PK)
├── user_id (text, FK → users)
└── title (text)

messages
├── id (uuid, PK)
├── chat_id (uuid, FK → chats)
├── role (enum)                 # user, assistant
├── content (text)
├── input_tokens (int)
└── output_tokens (int)

usage_records
├── id (uuid, PK)
├── user_id (text, FK → users)
├── input_tokens (int)
├── output_tokens (int)
└── model (text)
```

---

## Testing

**Framework**: Vitest (all apps)
**Location**: Colocated (`*.test.ts` next to source files)
**Coverage**: Backend has 27 tests passing

```bash
# Run all tests (watch mode)
pnpm test

# Run once
pnpm test:run

# With coverage
pnpm test:coverage

# Backend tests only
pnpm -F @prophet/backend test
```

See [.claude/skills/testing/SKILL.md](.claude/skills/testing/SKILL.md) for comprehensive testing patterns.

---

## Claude Code Skills

Detailed coding standards organized by topic in `.claude/skills/`:

- **frontend/** - UX patterns, component design, accessibility, visual polish, SEO
- **backend/** - API security, database patterns
- **stack/** - Next.js, Chrome extension setup
- **typescript-standards/** - Type safety across all code

These skills are automatically triggered when working on relevant code.

---

## Security

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
}
```

### Row Level Security (RLS)

**Current**: RLS disabled (security at API level)
**Production**: Optional - see `apps/backend/lib/db/migrations/0001_rls_policies.sql`

For production, you can:
- Enable RLS + Clerk→Supabase JWT integration
- OR keep RLS disabled and rely on API-level security (current approach)

Both are valid patterns. Current implementation validates auth in every API route.

---

## Troubleshooting

### Supabase Connection Issues (IPv6)

**Problem**: `ENOTFOUND db.*.supabase.co`

**Solution**: Use Session Pooler instead of Direct Connection
1. Supabase Dashboard → Settings → Database → Connection String
2. Change dropdown to **"Session Pooler"**
3. Copy that connection string to `.env.local`

Session Pooler is IPv4 compatible and works on all networks.

### Migration Errors

**Problem**: `Can't find meta/_journal.json`

**Solution**: Run `pnpm -F @prophet/backend db:generate` first

**Problem**: `url: undefined`

**Solution**: Ensure `.env.local` exists in `apps/backend/` with `DATABASE_URL`

### Chrome Extension Not Loading

1. Build first: `pnpm -F @prophet/sidepanel build`
2. Check `apps/sidepanel/dist` folder exists
3. Reload extension in `chrome://extensions`

---

## Environment Variables Reference

### Root `.env.local`

```bash
# Supabase PostgreSQL
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-api...

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Extension Config
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Marketing
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### Backend `.env.local`

Copy from root: `DATABASE_URL`, `ANTHROPIC_API_KEY`, Clerk keys, Upstash keys

### Marketing `.env.local`

Copy from root: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`

### Sidepanel `.env.local`

Copy from root: `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`

---

## Production Deployment

### Backend (Next.js API)

Deploy to Vercel, Railway, or any Node.js host:

```bash
pnpm -F @prophet/backend build
# Set environment variables in hosting platform
# Deploy apps/backend folder
```

### Marketing (Next.js)

Deploy to Vercel or any static host:

```bash
pnpm -F @prophet/marketing build
# Set NEXT_PUBLIC_* environment variables
# Deploy apps/marketing folder
```

### Sidepanel (Chrome Extension)

Publish to Chrome Web Store:

```bash
pnpm -F @prophet/sidepanel build
# Upload apps/sidepanel/dist to Chrome Web Store
```

---

## Contributing

1. Follow coding standards in `.claude/skills/`
2. Write tests for new features
3. Run `pnpm lint` before committing
4. Use conventional commits

---

## License

Proprietary - All rights reserved

---

## Support

- Project Documentation: [CLAUDE.md](CLAUDE.md)
- Claude Code Skills: [.claude/skills/](.claude/skills/)
- Issues: Create GitHub issue
