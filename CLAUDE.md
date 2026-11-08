# Prophet

Chrome side panel AI agent sold on prepaid credits, in a pnpm monorepo:

- `apps/sidepanel`: the extension (Vite, React 18). It owns the agent loop and runs browser tools over the Chrome DevTools Protocol.
- `apps/marketing`: landing pages and the only backend (Next.js 16, React 19). The API is `app/api/`.
- `apps/shared`: Zod schemas, types and limits, imported by both as `@prophet/shared`.

## Data flow

One `POST /api/agent/chat` is one Turn: side panel → API → Anthropic (streaming) → SSE back → the side panel runs the released tool calls in the user's tab and POSTs the results, until the Run ends. Clerk authenticates both the web app and the extension.

Installed extension builds outlive deploys, so the API keeps accepting what older builds send (`LEGACY_MODEL_ALIASES`, `LEGACY_MAX_AGENT_TURNS`, continuations without `runId`).

## Commands

- Filter by package with `pnpm -F @prophet/marketing`, `@prophet/sidepanel` or `@prophet/shared`; root scripts in `package.json` fan out with `pnpm -r`.
- Run tests once with `pnpm test:run` (`pnpm test` is Vitest watch mode). CI on pull requests runs type-check, lint, `pnpm test:run` and `pnpm build` (both apps, with placeholder env); run them before pushing.
- `pnpm build:sidepanel` builds in Vite development mode; `pnpm -F @prophet/sidepanel build:prod` builds in production mode.
- Leave to the developer: `db:migrate`, `db:push`, `db:seed` and `db:seed:reset` write to whatever `DATABASE_URL` points at, and a local `.env.local` can point at production. `pnpm test:agent` spends real Anthropic money. `db:generate` is yours.

## Before working on

- Any code (writing, editing or reviewing a diff) → read `CODING_STANDARDS.md`; every rule there applies
- Agent route, prompt caching, model IDs, rate limits or credit billing → read `.claude/docs/patterns.md`
- Agent loop, tool execution or SSE events → read `ARCHITECTURE.md`
- Naming anything about Runs, Turns or Credits → read `GLOSSARY.md` and use its terms in code, commits and copy
- Database schema, migrations or queries → read `.claude/docs/database-schema.md`
- Seeding, local setup, env vars or loading the unpacked extension → read `.claude/docs/setup.md`
- Extension sign-in/sign-out, Clerk config or `/auth-success` → read `.claude/docs/chrome-extension-auth.md`
- Running the agent without spending Credits (`VITE_USE_DEV_API`, `pnpm test:agent`) → read `.claude/docs/MOCK_MODE_GUIDE.md`
- Pricing, tiers or Margin → read `.claude/docs/pricing-model.md`
- Marketing copy, SEO pages or blog posts → read `.claude/docs/product-marketing-context.md`
- Noindexing or redirecting a URL → edit the list in `apps/marketing/lib/seo/pruned.mjs`; `PRUNED.md` records what was pruned and why

## Git

- Branch from `main` as `<type>/<topic>` (`feat/`, `fix/`, `chore/`, `docs/`, `seo/`) and open the PR against `main`. `autopilot/seo-*` branches belong to the SEO autopilot.
- Write Conventional Commits with a scope, naming the behaviour: `fix(marketing): keep one live Run per chat`. Scopes in use: `marketing`, `sidepanel`, `shared`, `seo`, `db`, `claude`.
- Production is the `prophet-marketing` Cloudflare Worker, serving `prophetchrome.com` since 2026-11-08. Merging to `main` does not update it: someone deploys by hand from `apps/marketing` with `pnpm build:vinext` then `npx cf deploy --prebuilt`, on Node 24.22 or newer (README, Deployment). Vercel still builds `main`, but it now serves only the `www` → root redirect and visitors whose DNS still points at it, and it is kept as the way back. A schema change has an ordering rule: see `.claude/docs/database-schema.md`.
- An extension release bumps the version in `apps/sidepanel/manifest.ts` and `apps/sidepanel/package.json`, and adds notes to `apps/sidepanel/RELEASE_NOTES.md`.
- If your change makes a line in these docs false, fix that line in the same PR.

## Guardrails

- Keep `ANTHROPIC_API_KEY` and every other secret server-side: the extension reaches Anthropic only through the marketing API, and client bundles read only public keys (`VITE_*`, `NEXT_PUBLIC_*`).
