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
- **Stripe** - https://dashboard.stripe.com (payments)

## 3. Configure Environment Variables

### Marketing (contains backend API)

Copy [apps/marketing/.env.example](apps/marketing/.env.example) → `apps/marketing/.env.local`

```bash
cp apps/marketing/.env.example apps/marketing/.env.local
# Edit with your credentials
```

### Sidepanel

Copy [apps/sidepanel/.env.example](apps/sidepanel/.env.example) → `apps/sidepanel/.env.local`

```bash
cp apps/sidepanel/.env.example apps/sidepanel/.env.local
# Copy VITE_* values
```

## 4. Initialize Database

```bash
pnpm db:migrate
```

## 5. Start Development

```bash
# All apps in parallel
pnpm dev

# Or individual apps
pnpm dev:web          # localhost:3000 (marketing + API)
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

## apps/marketing/.env.local

Copy from [apps/marketing/.env.example](apps/marketing/.env.example) - marketing + API needs:

**Database:**
- `DATABASE_URL` - Supabase PostgreSQL connection

**Anthropic:**
- `ANTHROPIC_API_KEY` - AI API (server-side only)

**Clerk:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret (server-side only)
- `CLERK_WEBHOOK_SECRET` - Clerk webhooks

**Upstash Redis:**
- `UPSTASH_REDIS_REST_URL` - Redis for rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - Redis auth token

**Stripe:**
- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification

**App URLs:**
- `NEXT_PUBLIC_APP_URL` - App URL (localhost:3000 in dev)

## apps/sidepanel/.env.local

Copy from [apps/sidepanel/.env.example](apps/sidepanel/.env.example) - Chrome extension needs:

- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk public key (Vite prefixed for build-time inlining)
- `VITE_API_URL` - API URL for extension requests (http://localhost:3000 in dev)
