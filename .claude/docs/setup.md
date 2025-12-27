# Getting Started

Complete setup guide for Prophet development environment.

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Setup External Services

Create accounts and get credentials from:

- **Clerk** - https://dashboard.clerk.com (authentication)
- **Supabase** - https://supabase.com (PostgreSQL database)
- **Anthropic** - https://console.anthropic.com (AI API)
- **Upstash** - https://upstash.com (Redis rate limiting)

## 3. Configure Environment Variables

Each app reads its own `.env.local`:

### Root

Copy [.env.example](.env.example) → `.env.local`

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Backend

Copy [apps/backend/.env.example](apps/backend/.env.example) → `apps/backend/.env.local`

```bash
cp apps/backend/.env.example apps/backend/.env.local
# Copy your values from root/.env.local
```

### Marketing

Copy [apps/marketing/.env.example](apps/marketing/.env.example) → `apps/marketing/.env.local`

```bash
cp apps/marketing/.env.example apps/marketing/.env.local
# Copy NEXT_PUBLIC_* values from root/.env.local
```

### Sidepanel

Copy [apps/sidepanel/.env.example](apps/sidepanel/.env.example) → `apps/sidepanel/.env.local`

```bash
cp apps/sidepanel/.env.example apps/sidepanel/.env.local
# Copy VITE_* values from root/.env.local
```

## 4. Initialize Database

```bash
pnpm -F @prophet/backend db:migrate
```

## 5. Start Development

```bash
# All apps in parallel
pnpm dev

# Or individual apps
pnpm dev:backend      # localhost:3000
pnpm dev:marketing    # localhost:3001
pnpm dev:sidepanel    # localhost:5173 (dev server, builds to dist/)
```

## 6. Load Chrome Extension

After building the sidepanel:

```bash
pnpm -F @prophet/sidepanel build
```

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `apps/sidepanel/dist` folder
5. Click the extension icon to open the sidepanel

---

# Environment Variables

**Monorepo Setup**: Each app has its own `.env.local` with only the variables it needs.

## Root (`.env.local`)

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

## apps/backend/.env.local

Copy from [apps/backend/.env.example](apps/backend/.env.example) - backend API needs:

- `DATABASE_URL`
- `ANTHROPIC_API_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

## apps/marketing/.env.local

Copy from [apps/marketing/.env.example](apps/marketing/.env.example) - marketing site needs:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## apps/sidepanel/.env.local

Copy from [apps/sidepanel/.env.example](apps/sidepanel/.env.example) - Chrome extension needs:

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key (Vite prefixed for build-time inlining)
- `VITE_API_URL` - Backend API URL for extension requests
