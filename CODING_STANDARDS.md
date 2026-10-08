# Coding Standards

The rules every diff in this repo is checked against, one per line. Writing code: every rule that touches the files you change holds before you finish. Reviewing: check the diff against every rule in turn.

## Security guardrails

- Keep `ANTHROPIC_API_KEY` and every other secret server-side: the extension reaches Anthropic only through the marketing API, and client bundles read only public keys (`VITE_*`, `NEXT_PUBLIC_*`).
- Open every API route with Clerk `auth()` and return 401 when `userId` is missing; webhook routes authenticate by signature instead.
- Scope every query on user-owned rows by `userId` as well as the row id (`and(eq(chats.id, chatId), eq(chats.userId, userId))`), returning 404 when nothing matches.
- Parse every request input (body, query, params) with a Zod schema via `safeParse`, returning 400 on failure; data from the extension and content scripts is untrusted.
- Rate-limit every authenticated API route with `checkRateLimit(userId, type)` (`apps/marketing/lib/ratelimit.ts`) right after `auth()`: `'chat'` for routes that call Anthropic, `'api'` for the rest.
- Verify webhook signatures before trusting the payload: Stripe with `stripe.webhooks.constructEvent` on the raw `request.text()` body, Clerk with `svix`.

## Credits and billing

- Change `creditsRemaining` only through a SQL expression in a single `UPDATE` (`sql\`${users.creditsRemaining} - ${cost}\``), never read-modify-write.
- Wrap writes that must land together in one `db.transaction`, such as a credit debit and its `usageRecords` row.
- Make webhook handlers idempotent: Stripe and Clerk redeliver events, so a replay (upsert, billing-period check) changes nothing.

## API responses and logging

- Build response bodies with `success(data)` / `error(message, code)` from `apps/marketing/types`, with an UPPER_SNAKE `code`.
- Answer unexpected failures with status 500 and `error(INTERNAL_ERROR_MESSAGE, 'INTERNAL_ERROR')`; the real error and stack go to the log, not the client.
- Log server-side through `logger` (`apps/marketing/lib/logger.ts`).

## Data layer

- Build queries with Drizzle (query API, builders, `sql` tagged templates) so every value is parameterised.
- Derive types from their source: rows from the schema (`$inferSelect` / `$inferInsert`), inputs from Zod (`z.infer`), cross-app shapes imported from `@prophet/shared`.
- Treat Redis as optional: rate limiting and caching keep working when Upstash is unset or unreachable.

## TypeScript

- Narrow instead of asserting: validate with Zod, or use a type guard or discriminant; `as const` is the only `as`.
- Type values of unknown shape as `unknown` and narrow them, never `any`.
- Fix type errors at the source: `strict` stays on, no `@ts-ignore`, and non-null `!` only where the value is provably set.
- Model mutually exclusive state as a discriminated union (`{ status: 'error'; error: string } | { status: 'success'; data: T }`), not a bag of optional flags.
- Use string-literal unions or `as const` objects in place of `enum`.
- Give a function with more than one parameter a single object argument (`reserveCredits({ db, userId, reserveCents })`).
- Annotate return types on exported functions; let inference handle locals.

## UI

- Give every interactive element hover, active and visible focus states; an `outline: none` always comes with a replacement focus ring.
- Give every image and icon-only control alt text or an `aria-label`.
- Show a loading or disabled state on every async action.

## Comments and tests

- Comment only non-obvious logic (algorithms, gotchas, the reason behind a choice); let names carry the rest.
- Colocate tests as `*.test.ts(x)` beside their source; billing, credit-calculation and auth changes always ship with tests.

## Where the detail lives

- Agent route, model IDs, prompt caching or cost calculation → the Key Points in `.claude/docs/patterns.md` are standards too; apply them to diffs in those areas.
