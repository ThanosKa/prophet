# Key Patterns

The agent route and rate limiting. Auth, ownership, validation and transaction rules live in `CODING_STANDARDS.md`.

## Streaming AI Response

`apps/marketing/app/api/agent/chat/route.ts` handles one Turn per request, in this order:

```typescript
// Never pass the raw client value: installed extensions send legacy model IDs.
const model = resolveAgentModel(requestedModel)

// Price the prompt, shrink max_tokens to what the balance covers (402 INSUFFICIENT_BALANCE
// if it can't cover the minimum), then take the Hold.
const plan = planCreditReservation({ model, balanceCents, cachedPrefixTokens, restTokens, maxTokens: AGENT_TURN_MAX_TOKENS, ... })
const hold = await reserveCredits({ db, userId, reserveCents: plan.reserveCents })

const anthropicStream = await anthropic.messages.stream({
  model,
  max_tokens: maxTokens,
  // Automatic caching: the breakpoint follows the newest block on every request.
  cache_control: { type: 'ephemeral' },
  // Explicit breakpoint on the static prefix (tools + system), shared by every chat.
  system: [{ type: 'text', text: AGENT_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
  tools: buildAgentTools(AGENT_TOOLS, webSearchEnabled),
  // DB history + the run's opening message + every earlier turn of the run, append-only
  messages: buildAgentMessages({ history, userMessage, image, runTurns }),
})

const finalMessage = await anthropicStream.finalMessage()
const { usage } = finalMessage

// `input_tokens` is only the uncached remainder; cache writes and reads are billed
// separately (writes 1.25x input, reads 0.1x, 0.05x on Opus 5.5 and Sonnet 5.5).
// Haiku 5.5 bills the whole request at a higher rate card once the prompt passes 100K tokens.
const costCents = calculateUsageCostInCredits(model, {
  inputTokens: usage.input_tokens,
  cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
  cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  outputTokens: usage.output_tokens,
  webSearchRequests: usage.server_tool_use?.web_search_requests ?? 0,
})

// Locks the chat row first (writeRunRecord), then the user row (settleCredits).
await db.transaction(async tx => {
  await writeRunRecord({ tx, chatId, request: runRequest, ending, model, usage: { inputTokens, outputTokens, costCents } })
  await settleCredits({ db: tx, userId, hold, actualCents: costCents })
  await tx.insert(usageRecords).values({ userId, inputTokens, cacheCreationInputTokens, cacheReadInputTokens, outputTokens, costCents, model })
})
```

The route's own `ReadableStream` sends these as SSE events (`text/event-stream`); `ARCHITECTURE.md` lists them.

### Key Points

- Use `anthropic.messages.stream()` for streaming responses
- Await `finalMessage()` for authoritative usage, including `server_tool_use.web_search_requests`
- Release client tool calls only after a `tool_use` stop: collect them while streaming and send the `tool_use` events after `finalMessage()`, before `citations`, `execution_complete` and `done` (extension 1.0.5 takes `execution_complete` without a prior tool call as the final answer). On `max_tokens`, `refusal`, Stop or an error, send none and store none; on `max_tokens`, `done.contentBlocks` drops the cut-off call
- Each Run keeps one assistant row, updated after every Turn (`writeRunRecord` in `lib/agent/run-record.ts`): in the billing transaction on a normal end, and in the unfinished-Turn settlement on Stop, disconnect or error. The Run's user row is saved under the chat lock before the first Turn (`openRun`), so it survives a failed Turn. Lock the chat row before the user row in every transaction that writes the record. A new Run's prompt renders an earlier assistant row as its text plus an "Actions taken" list
- The live Run is the chat's newest user row. `session_created` carries `runId` (the Run's opening row id), and a continuation that sends it back gets 409 `RUN_SUPERSEDED` before any Hold once a newer Run has started (`resumeRun`); its prompt uses the rows up to and including the `runId` row. `writeRunRecord` re-checks under the chat lock and skips a superseded Run's record, while billing still settles. A continuation without `runId` (extension 1.0.5) keeps the legacy rules
- A Run's last Turn (`lib/agent/last-turn.ts`) gets a mid-conversation `role: "system"` notice after the newest tool results, releases no tool calls and records none, saves its text as the Run's reply, and ends with `done.runEnd: "turn_limit" | "run_budget"`. A Turn is the last when the request carries `MAX_AGENT_TURNS - 1` earlier Turns, or `LEGACY_MAX_AGENT_TURNS - 1` without a `runId` (extension 1.0.5), or its estimated prompt reaches `RUN_BUDGET_TOKENS`. A `pause_turn` resume (no tool results) is never a last Turn. Never change `tool_choice` or the tools for it: that invalidates the messages cache on the Run's largest prompt
- A Run's prompt carries only the history window (`windowHistory` in `lib/agent/conversation.ts`): the newest rows before the opening message whose rendered size fits `HISTORY_BUDGET_TOKENS`, always including the newest one. Turn 1 and every continuation pass it the same rows, so the bytes before the opening message never change
- Resolve legacy model IDs before the call and bill from the model actually invoked
- Bill all three input buckets with `calculateUsageCostInCredits`; the prompt's size is `input_tokens + cache_creation_input_tokens + cache_read_input_tokens`, which is what context displays must show
- Take the Hold with `reserveCredits` before the call, and settle with `settleCredits` in the same transaction as `writeRunRecord` and the `usageRecords` row; a Stop, disconnect or error settles too
- Take every size limit from `AGENT_SIZE_LIMITS` in `@prophet/shared` (next to `MAX_AGENT_TURNS`), never a local number. The route answers a body over `requestBytes` with 413 `REQUEST_TOO_LARGE`; the request schema caps each field and shortens an over-cap tool result the same way every time, so the cached prefix holds
- Take a model's context window from `getModelContextWindow` (the `contextWindowTokens` on `MODEL_CONFIG`), never a fixed 200K: the chat's stored context is clamped by it, and the side panel's context meter divides by it (`selectMaxContextTokens` in `uiStore.ts`)

### Prompt Caching

Caching is a prefix match over `tools` -> `system` -> `messages`; any changed byte
invalidates everything after it. The agent route uses two of the four breakpoints:

| Breakpoint | Covers | Why |
| --- | --- | --- |
| `cache_control` on the system block | 19 tools + system prompt (~4.4k tokens) | Identical for every user and chat, so it is a guaranteed read point that survives anything later in `messages` |
| Top-level `cache_control` (automatic) | The whole conversation so far | Moves to the newest block each request, so turn N+1 reads what turn N wrote |

Rules that keep it hitting:

- **Append-only runs.** The extension resends every earlier turn of the run as
  `previousTurns` (the server's `contentBlocks` from each `done` event, unchanged),
  plus the run's image. Never trim, reorder or rewrite an earlier turn.
- **Replay thinking blocks.** They are part of the prefix and are signature-checked by
  the API; dropping or editing them breaks the cache and, on every current model,
  the preserved-thinking check.
- **Same settings for the whole run.** The same `enableThinking` on every request, so
  `thinking` and `output_config.effort` never change mid-run. Tool order is a fixed
  array; web search is a server-wide flag. No timestamps or IDs in the system prompt.
- **Minimums.** Haiku 5.5, Sonnet 5.5 and Opus 5.5 all cache prefixes from 512 tokens,
  so the tools + system breakpoint (~4.4k tokens) caches on every model. Don't pad the prompt.
- **Verify** with `usage.cache_read_input_tokens` (persisted on `usage_records`); in a
  healthy run it grows every turn while `cache_creation_input_tokens` stays near the
  size of the last turn.
- **The Hold expects the cache.** For a continuation that sends `previousTurns`, the
  Hold prices the prompt the previous Turn sent (system, tools, history window, opening
  message, every earlier Turn but the newest) at the cache-read rate and the rest,
  including a last Turn's notice, at the cache-write rate. First Turns and the legacy
  single-Turn form price the whole prompt as a cache write. Settlement bills the real
  usage, so a cache miss settles above the Hold as overage and is logged.

### Model IDs and Legacy Aliases

Vite inlines `MODEL_CONFIG` into the extension bundle at build time, so installed
builds keep sending the model IDs they shipped with. `agentModelSchema` therefore
still accepts those legacy IDs, and `resolveAgentModel()` maps them to the current
model before the Anthropic call. Every cost calculation and DB row must use the
resolved value, never the raw request field.

| Sent by installed extension builds | Actually called |
| --- | --- |
| `claude-opus-5` | `claude-opus-5-5` |
| `claude-opus-4-6` | `claude-opus-5-5` |
| `claude-sonnet-5` | `claude-sonnet-5-5` |
| `claude-sonnet-4-6` | `claude-sonnet-5-5` |
| `claude-haiku-4-5` | `claude-haiku-5-5` |

### Server-Side Web Search

Anthropic's `web_search_20250305` tool runs on Anthropic's infrastructure and is
billed per search ($10 per 1,000) on top of tokens. It is gated twice: the
`ENABLE_WEB_SEARCH` env flag and the per-request `enableWebSearch` field, and stays
off until the extension can render its blocks. Search results carry
`encrypted_content` that must be echoed back byte-for-byte on continuation turns,
so continuation content comes from `finalMessage.content` rather than being
rebuilt from streamed deltas.

## Rate Limiting

The limits and limiters live in `apps/marketing/lib/ratelimit.ts`. Answer an over-limit request like the agent route does:

```typescript
const rateLimitResult = await checkRateLimit(userId, 'chat')

if (!rateLimitResult.success) {
  return NextResponse.json(
    error('Too many requests. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((rateLimitResult.reset! - Date.now()) / 1000)),
        'X-RateLimit-Limit': rateLimitResult.limit?.toString() || '',
        'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '',
        'X-RateLimit-Reset': rateLimitResult.reset?.toString() || '',
      },
    }
  )
}
```

### Key Points

- The `chat` limits are sized for agent loops, not chat: a single agent run fires one POST per tool round-trip, so chat-scale limits (5/min) starve normal usage. Credits are the real product quota.
- **Global burst protection** (500 req/min across all users) is checked first and prevents DoS
- Rate limit by **userId** (not IP); the tier comes from `getUserTier` in `lib/cache.ts` (Redis-cached, database on a miss)
- **Separate Ratelimit instances** per tier with unique prefixes
- **Two-layer approach** for AI SaaS: request limits (infrastructure) + credit limits (budget)
- See `.claude/skills/rate-limiting/SKILL.md` for comprehensive patterns
