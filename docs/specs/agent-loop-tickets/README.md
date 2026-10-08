# Tickets: Agent loop fixes and a clean release

Spec: `docs/specs/agent-loop-fixes.md`. Read it first. The tickets name the decisions; the spec explains them.

**Agents do every step** (owner's decision, 2026-10-08), including the merges into `main`. The owner only does two things:
- answers Claude Code's permission prompt for each production database write;
- uploads the 1.0.7 zip, but only if the session can't reach the owner's Chrome.

Ticket 13 deletes this folder. After that, read tickets 14 and 15 with `git show <sha>:docs/specs/agent-loop-tickets/<file>`. Ticket 13 writes the SHA in its PR body.

| # | Ticket | Blocked by | Issues |
|---|---|---|---|
| 01 | Set up the worktree, commit the spec, fold stray work into PRs | - | - |
| 02 | Fix the production migration journal | 01 | #17 |
| 03 | Merge PR #19 and PR #18 into dev | 01 | - |
| 04 | Echo tool calls by shape only, keep `caller` | 03 | #5 (server), #13 |
| 05 | Release tool calls only after a clean end of Turn | 04 | #7, #10 |
| 06 | Keep a progress record for every Run | 05 | #9, #16 |
| 07 | One live Run per chat | 06 | #15 (server) |
| 08 | Last Turn without tools, Run budget, history window | 06 | #4 (server), #12 |
| 09 | Cache-aware Hold | 08 | #11 |
| 10 | Size limits and real context windows | 04 | #8, #12 |
| 11 | Side panel: agent loop behaviour | 07, 08, 10 | #4, #5, #14, #15 |
| 12 | Side panel: caps, reload view, 1.0.7 | 10, 11 | #8, #9, #12 |
| 13 | Agent-loop PR into dev | 02, 04-12 | - |
| 14 | Release dev to main and close every issue | 13 | all |
| 15 | Clean every worktree and branch | 14 | - |

Ticket 02 can run alongside 03-12. If it waits on a permission prompt, carry on with the others.

## Conventions for every code ticket
- Work test-first (`/tdd`) at the spec's two seams:
  - the agent chat route, with pglite and a mocked Anthropic stream. Use the pglite route test files, not the ones that mock the database;
  - the side-panel agent loop, with mocked fetch and background bridge.
- Read `CODING_STANDARDS.md` before writing code. Don't use `as` casts. Functions with more than one parameter take an object.
- Commit on `fix/agent-loop` in the worktree `C:\Users\thaka\Local\Cursor\prophet-agent-loop`, with conventional commit messages, and push.
- Update the docs the spec lists in the same ticket as the code they describe.
- A ticket is done when `pnpm test:run`, typecheck, lint and build all pass.
- `.env.local` points at **production**. Read-only SQL is fine. Every write goes through Claude Code's permission prompt.
- Never run `pnpm test:agent`: it calls Anthropic and writes to production.
- Inside a database transaction, use only the transaction handle. pglite runs everything under one lock, so a call on the outer handle hangs the test.
