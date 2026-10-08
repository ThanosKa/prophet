# 06 · Keep a progress record for every Run

Blocked by: 05 · Issues: #9, #16

## What to build
See the spec section "Run progress record (#9, #16, #15)". This ticket covers everything there except `runId` and superseding, which are ticket 07.

- **Run start, in this order:**
  1. Read the history without a lock.
  2. Plan and take the Hold. A 402 or a `BALANCE_HELD` 409 returns here, with nothing written.
  3. In one transaction: lock the chat row with `FOR UPDATE`, read the history again, and insert the user row with `clock_timestamp()`. If this transaction fails, settle the Hold at zero and return 500.
  4. Build the prompt from the read taken under the lock.
- **The Run's assistant row** is the first assistant row after the opening row.
  - Insert it at the end of the first Turn that has text or released tool calls.
  - After that, update it at the end of every Turn: in the billing transaction on a normal end, and in the unfinished-Turn settlement on Stop, disconnect or error.
  - Its content is the visible text so far.
  - Its `tool_calls` hold every tool call that was released to the extension, oldest first, as `{type, id, name, input, isError?}`. Fill in `isError` from the matching `tool_result` when the next continuation arrives. Never store tool results.
  - A Turn that ends any other way (Stop, error, `max_tokens`, a last Turn) adds only its text.
  - For legacy single-Turn requests, append to the stored row instead of recomputing it.
  - For a request without `runId`, update the row only if it doesn't exist yet, or if its stored tool-call ids are a prefix of the request's `tool_use` ids. Otherwise skip the record write; billing still settles.
- **Refused Turn.** Drop that Turn's text and tool calls, and append a fixed note that Claude declined.
- **Lock order.** Every transaction that writes the record locks the chat row first, then the user row. Reorder the billing transaction to match.
- **Shared stored-tool-call schema.** `safeParse` the column wherever it is read: the conversation builder and the chat messages API. No casts.
- **A new Run's prompt.** Render an assistant row with tool calls as its text plus a compact "actions taken" list. Cap each action's input JSON at 300 chars, and the text at 8,000 chars, keeping the head and the tail.
- **Continuations** still drop the trailing assistant row. Ticket 07 replaces this for builds that send `runId`.
- **Another user's chat** returns 404, not 403.
- **Docs.**
  - `.claude/docs/database-schema.md`: one assistant row per Run, updated every Turn, and the `tool_calls` shape.
  - `.claude/docs/patterns.md`: one assistant row per Run.

## Acceptance criteria
- [ ] Route test: the user row exists after a first Turn that fails with an Anthropic error. No user row exists after a 402.
- [ ] Route tests: the Run's single assistant row holds the text and every released tool call, and no tool results, after each of:
  - [ ] a tool-use Turn;
  - [ ] an aborted request (Stop);
  - [ ] a stream error mid-Turn.
- [ ] Route test: a tool call whose result had `is_error` is stored with `isError: true`.
- [ ] Route test: a later Run's Anthropic request contains the earlier Run's actions.
- [ ] Route test: a refused continuation Turn leaves the earlier Turns' record plus the declined note.
- [ ] Route test: two legacy Runs in one chat never overwrite each other's row.
- [ ] Route test: another user's chat returns 404.
