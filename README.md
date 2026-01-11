<div align="center">

<img src="./apps/marketing/public/logo.svg" alt="Prophet" width="80" height="80" />

<h1>Prophet</h1>

[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 18](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Radix-8A3FFC?style=for-the-badge)](https://ui.shadcn.com/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)
[![Anthropic](https://img.shields.io/badge/Anthropic_Claude-000000?style=for-the-badge&logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/ThanosKa/prophet?style=for-the-badge&logo=github)](https://github.com/ThanosKa/prophet/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

<p>AI-powered Chrome side panel extension with streaming chat, secure backend API, and credits-based billing. Built for developers who want a production-ready SaaS template with authentication, rate limiting, and AI integration.</p>

[Report Bug](https://github.com/ThanosKa/prophet/issues/new?template=bug_report.md) · [Request Feature](https://github.com/ThanosKa/prophet/issues/new?template=feature_request.md) · [Discussions](https://github.com/ThanosKa/prophet/discussions)

</div>

---

## Screenshots

<div align="center">
  <img src="./apps/marketing/public/hero.jpg" alt="Prophet - AI-powered Chrome extension in action" width="90%" />
</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
  - [Chrome Extension](#chrome-extension)
  - [Backend & API](#backend--api)
  - [Developer Experience](#developer-experience)
- [Screenshots](#screenshots)
- [Demo](#demo)
- [How It Works](#how-it-works)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
  - [Run Locally](#run-locally)
  - [Load Chrome Extension](#load-chrome-extension)
  - [Testing](#testing)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Deployment](#deployment)
  - [Deploy to Vercel](#deploy-to-vercel)
  - [Production Checklist](#production-checklist)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [Security](#security)
- [Acknowledgments](#acknowledgments)
- [Star History](#star-history)
- [Contact](#contact)
- [Support & Sponsor](#support--sponsor)
- [License](#license)
- [Contributions](#contributions)

---

## About

Prophet is a production-ready Chrome extension SaaS template that demonstrates how to build a complete AI-powered application with streaming chat, authentication, payments, and rate limiting. It features a side panel extension that communicates with a secure Next.js backend API powered by Anthropic's Claude AI.

Perfect for developers who want to:
- Ship a Chrome extension SaaS product quickly
- Learn modern full-stack architecture patterns
- Build AI-powered applications with streaming responses
- Implement credits-based billing with Stripe
- Scale from 0 to production with proper infrastructure

## Features

### Chrome Extension
- **Side Panel Chat Interface**: Native Chrome side panel with beautiful UI
- **Streaming AI Responses**: Real-time Claude AI responses with streaming
- **Multi-Chat Support**: Create, manage, and switch between multiple conversations
- **Authentication Flow**: Seamless Clerk authentication via web app
- **Auto-Sync Sessions**: Extension automatically syncs auth state
- **Offline Support**: Graceful handling of network issues

### Backend & API
- **Credits-Based Billing**: Transparent pricing (1 credit = 1 cent API cost)
- **Subscription Tiers**: Free ($0.50), Pro ($11 + 10%), Premium ($35 + 17%), Ultra ($70 + 17%)
- **Rate Limiting**: Tier-based limits (Free: 5/min, Pro: 20/min, Premium/Ultra: 60/min) + global burst protection
- **Streaming API**: Server-Sent Events for real-time AI responses
- **Webhooks**: Clerk user sync + Stripe payment processing
- **Token Tracking**: Accurate usage monitoring with cost attribution

### Developer Experience
- **Monorepo Setup**: pnpm workspaces for efficient package management
- **Type Safety**: End-to-end TypeScript with Zod validation
- **Database Migrations**: Drizzle ORM with version-controlled schema
- **Testing**: Vitest for unit and integration tests
- **Linting & Formatting**: ESLint + Prettier with pre-commit hooks
- **Claude Code Skills**: Comprehensive coding standards in `.claude/skills/`
- **Hot Reload**: Fast dev experience with Vite + Next.js

## Demo

- Run locally: `pnpm dev` → Extension at `localhost:5173`, Marketing at `localhost:3000`
- Chrome Extension: Load `apps/sidepanel/dist` as unpacked extension
- Sign in via marketing site → Auth syncs to extension → Start chatting

Quick preview: Sign in → Open Prophet extension → Type message → Claude streams response → Credits deducted automatically

## How It Works

1. User installs Chrome extension and clicks "Sign in via Prophet Website"
2. Opens marketing site in new tab, authenticates with Clerk
3. Clerk stores session in `chrome.storage.local` via extension sync
4. Extension detects session change → auto-reloads → user is logged in
5. User types message → Extension sends to `/api/chat` endpoint
6. Backend authenticates user, checks credits, validates rate limit
7. Streams request to Anthropic Claude API → proxies response back
8. Extension receives Server-Sent Events → displays streamed response
9. Backend tracks tokens, deducts credits, saves message to database
10. User can view chat history, manage subscription, purchase credits

## Built With

| Category         | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | Next.js 16 (App Router)                  |
| Language         | TypeScript (strict mode)                 |
| Styling          | Tailwind CSS + shadcn/ui                 |
| State Management | Zustand + TanStack Query                 |
| Extension        | Vite + CRXJS + React 18                  |
| Auth             | Clerk v2.0 (web + extension)             |
| Database         | Supabase (PostgreSQL) + Drizzle ORM      |
| AI Model         | Anthropic Claude (Sonnet 4.5)            |
| Rate Limiting    | Upstash Redis (sliding window)           |
| Caching          | Upstash Redis (tier caching, 5min TTL)   |
| Payments         | Stripe (subscriptions + webhooks)        |
| Validation       | Zod                                      |
| Build Tool       | pnpm workspaces                          |
| Hosting          | Vercel (recommended)                     |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Accounts: Clerk, Supabase, Anthropic, Upstash Redis, Stripe

### Installation

```bash
git clone https://github.com/ThanosKa/prophet.git
cd prophet
pnpm install
```

### Environment Setup

See [`.claude/docs/setup.md`](.claude/docs/setup.md) for detailed instructions.

**Quick setup:**

```bash
# Marketing app (backend API)
cp apps/marketing/.env.example apps/marketing/.env.local
# Fill in: DATABASE_URL, ANTHROPIC_API_KEY, CLERK keys, UPSTASH keys, STRIPE keys

# Sidepanel extension
cp apps/sidepanel/.env.example apps/sidepanel/.env.local
# Fill in: VITE_CLERK_PUBLISHABLE_KEY, VITE_API_URL
```

### Database Setup

```bash
pnpm db:migrate
```

Optional: Seed test data (auto-detects first user):
```bash
pnpm -F @prophet/marketing db:seed
```

### Run Locally

```bash
# Start both apps in parallel
pnpm dev

# Or individually:
pnpm dev:web          # Marketing + API at localhost:3000
pnpm dev:sidepanel    # Extension dev server at localhost:5173
```

### Load Chrome Extension

After building the sidepanel:

```bash
pnpm -F @prophet/sidepanel build
```

1. Open `chrome://extensions`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select `apps/sidepanel/dist` folder
5. Click the extension icon to open the sidepanel

### Testing

```bash
pnpm lint              # ESLint all apps
pnpm type-check        # TypeScript validation
pnpm test              # Run tests in watch mode
pnpm test:run          # Run tests once
pnpm test:coverage     # Coverage report
```

## Project Structure

```
prophet/
├── apps/
│   ├── sidepanel/          # Chrome extension (Vite + React 18)
│   │   ├── src/
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   ├── store/      # Zustand stores
│   │   │   └── lib/        # Utilities
│   │   └── manifest.json   # Chrome extension manifest
│   ├── marketing/          # Next.js marketing + API
│   │   ├── app/
│   │   │   ├── api/        # API routes (chat, webhooks)
│   │   │   └── ...         # Pages and layouts
│   │   ├── components/     # React components
│   │   ├── lib/
│   │   │   ├── db/         # Drizzle schema, migrations
│   │   │   ├── ratelimit/  # Rate limiting logic
│   │   │   └── cache/      # Redis caching
│   │   └── scripts/        # Seed scripts
│   └── shared/             # Shared code
│       ├── types/          # Shared TypeScript types
│       └── utils/          # Shared utilities
├── .claude/
│   ├── docs/               # Detailed documentation
│   └── skills/             # Coding standards (topic-based)
└── .github/
    ├── workflows/          # CI/CD pipelines
    └── ISSUE_TEMPLATE/     # Issue templates
```

## Architecture

**Monorepo Structure:**
- `apps/sidepanel` - Chrome extension (Vite + React 18)
- `apps/marketing` - Next.js landing page + backend API (App Router)
- `apps/shared` - Shared types, utilities, Zod schemas

**Data Flow:**
Extension → Backend API (`/api/chat`) → Anthropic API (streaming) → Backend → Extension

**Authentication:**
- Clerk handles authentication across web app and Chrome extension
- Extension syncs session via `chrome.storage.local`
- Auto-reload on auth state changes

**SaaS Model:**
- Credits-based billing (1 credit = 1 cent API cost)
- Tiers: Free ($0.50), Pro ($11 +10%), Premium ($35 +17%), Ultra ($70 +17%)
- Stripe subscriptions with automatic credit allocation
- Non-expiring credits, roll over monthly

**Security:**
- ANTHROPIC_API_KEY never exposed to client (server-side only)
- All requests authenticated via Clerk middleware
- Rate limiting per tier + global burst protection (500 req/min)
- Input validation with Zod schemas
- Resource ownership verification on all queries

**Caching:**
- User tier cached in Redis (5min TTL) for fast rate limit checks
- Cache invalidation on Stripe/Clerk webhook events
- Reduces database load for high-traffic scenarios

## Deployment

### Deploy to Vercel

The easiest way to deploy Prophet is with Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Set root directory to `apps/marketing`
4. Add all environment variables from `.env.local`
5. Update `NEXT_PUBLIC_APP_URL` to your production domain
6. Deploy

**Note**: Only the marketing app (backend API) needs deployment. The Chrome extension runs client-side.

### Production Checklist

- [ ] Configure production environment variables
- [ ] Set up Supabase connection pooling (Session mode recommended)
- [ ] Configure Clerk production instance and webhooks (`/api/webhooks/clerk`)
- [ ] Enable Stripe live mode with webhook endpoint (`/api/webhooks/stripe`)
- [ ] Set up Upstash Redis production instance
- [ ] Add production Clerk extension ID to Allowed Origins
- [ ] Configure custom domain and SSL
- [ ] Test all payment flows and webhooks
- [ ] Verify Chrome extension connects to production API
- [ ] Enable error tracking and monitoring
- [ ] Review rate limits and scaling strategy

## CI/CD

`.github/workflows/ci.yml` runs automated checks on every push and pull request:

- ESLint for code quality
- TypeScript type checking (`pnpm type-check`)
- Uses Node.js 20 and pnpm 9 for consistency
- Skips builds (Vercel handles deployment)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow our [Code of Conduct](CODE_OF_CONDUCT.md). Use the issue templates for bugs and features, and the PR template when submitting changes.

Key areas for contribution:
- UI/UX improvements
- Performance optimizations
- Documentation improvements
- Bug fixes and security patches

## Security

Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md). Do not file public issues for security concerns.

Key security features:
- Server-side API key management
- Row-level security (RLS) migration available
- Rate limiting and abuse prevention
- Webhook signature verification
- Input validation and sanitization

## Acknowledgments

- [Anthropic](https://www.anthropic.com/) for Claude AI
- [Clerk](https://clerk.com/) for authentication
- [shadcn/ui](https://ui.shadcn.com) for UI components
- [Vercel](https://vercel.com) for hosting
- [Next.js](https://nextjs.org/) for the framework
- [Drizzle](https://orm.drizzle.team/) for the ORM
- [Upstash](https://upstash.com/) for serverless Redis

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ThanosKa/prophet&type=Date)](https://star-history.com/#ThanosKa/prophet&Date)

## Contact

- GitHub Issues: [Open an issue](https://github.com/ThanosKa/prophet/issues)
- GitHub Discussions: [Start a discussion](https://github.com/ThanosKa/prophet/discussions)
- Creator: [@ThanosKa](https://github.com/ThanosKa)

## Support & Sponsor

**Documentation & Help:**
- Project Documentation: [CLAUDE.md](CLAUDE.md)
- Claude Code Skills: [.claude/skills/](.claude/skills/)
- Detailed Setup: [.claude/docs/setup.md](.claude/docs/setup.md)
- Database Schema: [.claude/docs/database-schema.md](.claude/docs/database-schema.md)
- Key Patterns: [.claude/docs/patterns.md](.claude/docs/patterns.md)

**Support the Project:**
- ⭐ Star the repo
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/thaka)
- 💖 [GitHub Sponsors](https://github.com/sponsors/ThanosKa)

## License

Licensed under the Apache 2.0 License - see [LICENSE](LICENSE).

## Contributions

Contributions are welcome! Please feel free to submit a Pull Request.

### Contributors

<a href="https://github.com/ThanosKa/prophet/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=ThanosKa/prophet" alt="Contributors"/>
</a>
