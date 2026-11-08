# Coding Standards

The rules every diff in this repo is checked against, one per line, alongside the guardrails in `CLAUDE.md`. Writing code: every rule that touches the files you change holds before you finish. Reviewing: check the diff against every rule in turn. Some older code predates a rule; new and changed code follows it.

## Security guardrails

- Open every API route with Clerk `auth()` and return 401 when `userId` is missing. Exceptions: webhook routes authenticate by signature and are listed in `isPublicRoute` in `apps/marketing/proxy.ts`; `/api/agent/chat/dev` answers 403 outside `NODE_ENV=development`.
- Scope every query on user-owned rows by `userId` as well as the row id (`and(eq(chats.id, chatId), eq(chats.userId, userId))`), returning 404 when nothing matches.
- Parse every request input (body, query, params) with a Zod schema via `safeParse`, returning 400 on failure; data from the extension and content scripts is untrusted.
- Rate-limit every authenticated API route with `checkRateLimit(userId, type)` (`apps/marketing/lib/ratelimit.ts`) right after `auth()`: `'chat'` for the agent route, `'api'` for the rest.
- Verify webhook signatures before trusting the payload: Stripe with `await stripe.webhooks.constructEventAsync` on the raw `request.text()` body (the sync `constructEvent` throws on Workers), Clerk with `svix` on the raw `req.text()` body.

## Credits and billing

- Change `creditsRemaining` and `purchasedCredits` only in a single `UPDATE`, never read-modify-write: a SQL expression for debits and refunds (`sql\`${users.creditsRemaining} - ${cost}\``), an absolute value only for a Stripe plan reset.
- Wrap writes that must land together in one `db.transaction`, such as a credit settlement and its `usageRecords` row.
- Make webhook handlers idempotent: Stripe and Clerk redeliver events, so a replay (upsert, billing-period check) changes nothing.

## API responses and logging

- Build response bodies with `success(data)` / `error(message, code)` from `apps/marketing/types`, with an UPPER_SNAKE `code`.
- Answer unexpected failures with status 500 and `error(INTERNAL_ERROR_MESSAGE, 'INTERNAL_ERROR')`; the real error and stack go to the log, not the client.
- Log server-side through `logger` (`apps/marketing/lib/logger.ts`).

## Data layer

- Build queries with Drizzle (query API, builders, `sql` tagged templates) so every value is parameterised.
- Derive types from their source: rows from the schema (`$inferSelect` / `$inferInsert`), inputs from Zod (`z.infer`), cross-app shapes imported from `@prophet/shared`.
- Treat Redis as optional: rate limiting and caching keep working when Upstash is unset, and `lib/cache.ts` falls back to the database when Redis fails.

## TypeScript

- Narrow instead of asserting: validate with Zod, or use a type guard or discriminant; `as const` is the only `as`.
- Type values of unknown shape as `unknown` and narrow them, never `any`.
- Fix type errors at the source: `strict` stays on, and non-null `!` only where the value is provably set.
- Use string-literal unions or `as const` objects in place of `enum`.
- Give a function you write with more than one parameter a single object argument (`reserveCredits({ db, userId, reserveCents })`); callbacks and framework signatures keep their shape.
- Annotate return types on exported functions in `lib/` and `apps/shared`; React components, route handlers and locals infer theirs.

## UI

- Give every image and icon-only control alt text or an `aria-label`.

## Tests

- Colocate tests as `*.test.ts(x)` beside their source; billing, credit-calculation and auth changes always ship with tests.

## Where the detail lives

- Agent route, model IDs, prompt caching or cost calculation → the Key Points and rules in `.claude/docs/patterns.md` are standards too; apply them to diffs in those areas.
