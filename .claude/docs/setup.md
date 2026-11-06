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

```bash
cp apps/marketing/.env.example apps/marketing/.env.local
# Edit with your credentials
```

### Sidepanel

```bash
cp apps/sidepanel/.env.example apps/sidepanel/.env.local
# Copy VITE_* values
```

## 4. Initialize Database

```bash
pnpm db:migrate
```

`pnpm -F @prophet/marketing db:seed` / `db:seed:reset` refuse `NODE_ENV=production` but write to whatever `DATABASE_URL` points at, and a local `.env.local` can point at the prod database. Confirm the target before running either.

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

`apps/marketing/.env.example` and `apps/sidepanel/.env.example` document every variable. `apps/sidepanel/.env.example` sets `VITE_USE_DEV_API=mock`, so a copied file runs the mock agent until you change it; see `.claude/docs/MOCK_MODE_GUIDE.md`.
