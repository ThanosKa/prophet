# 07 · One live Run per chat

Blocked by: 06 · Issues: #15 (server part; ticket 11 has the extension part)

## What to build
See the spec section "Run progress record", items "Run id", "One live Run per chat" and "Continuation history".

- **Run id.** `session_created` carries `runId`, the id of the Run's opening user row. The shared request schema accepts an optional uuid `runId`.
- **A continuation with `runId`:**
  - If `runId` isn't the chat's newest user row, return 409 `RUN_SUPERSEDED` with a JSON message, before taking a Hold.
  - Otherwise build the history from the rows up to and including the `runId` row.
- **Record writes**, in billing and in settlement, run under the chat lock and first check that the Run is still the newest. If it isn't, skip the record write and still settle billing.
- **A continuation without `runId`** (extension 1.0.5) keeps ticket 06's legacy rules.
- **Docs.** `.claude/docs/patterns.md`: the live Run is the chat's newest user row.

## Acceptance criteria
- [ ] Route test: Run A finishes Turn 1, then Run B starts. A's continuation with A's `runId` gets 409 `RUN_SUPERSEDED`, takes no Hold and writes no record.
- [ ] Route test: B's continuation prompt contains nothing A wrote after B started.
- [ ] Route test: when A's in-flight Turn ends after B started, A's billing settles but A's row is not updated.
- [ ] Route test: a continuation without `runId` behaves as in ticket 06.
- [ ] Optional: a contention test on the opt-in Docker Postgres backend.
