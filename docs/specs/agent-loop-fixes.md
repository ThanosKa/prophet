# Spec: Agent loop fixes and a clean release

Status: ready-for-agent · Decided 2026-10-08 · Vocabulary: see `GLOSSARY.md` · Tickets: `docs/specs/agent-loop-tickets/`

This spec does two things. It fixes every open GitHub issue (#4 to #17). It then takes all open work to production and leaves nothing behind: every fix is merged into `dev`, then `main`. Every issue is closed with a comment, every worktree and stale branch is removed, and no uncommitted code is left on disk. The spec and its tickets are committed with the work and deleted in the last commit before release, as the pricing spec was.

It builds on PR #19 (pricing and credits, Claude Haiku 5.5, Turn limit 20). The bugs in #4, #5, #7, #9, #15 and #16 were reproduced on `dev` (same as `main`, so production) on 2026-10-08 with tests that assert the correct behaviour and failed. The rest were confirmed by reading the code at PR #19's head.

## Problem Statement

As a user, my Run sometimes dies halfway with "Invalid request body", after I've already paid for the earlier Turns. It happens when Claude picks a tool value that the tool definition allows but the server's check doesn't: scrolling up with `pixels: -500`, waiting `ms: 90000` or `1500.5`, or navigating to `google.com` without `https://`. All six such values got a 400 on the next Turn.

As a user, the agent can act and nobody checks the result. On the last Turn of a Run, the extension still runs the tool calls Claude asked for, for example a click on "Submit". It then shows "paused", and Claude never sees what the click did. A purchase, a sent form or a delete can go through with no confirmation.

As a user, when Claude's reply is cut off by the output limit in the middle of a tool call, the extension runs that tool with an empty input and doesn't tell me the reply was cut off. This is more likely when my balance is low, because the server then lowers the output limit. The empty input then fails the server's check on the next Turn, and the Run dies. When Claude declines a request partway through a Turn, the tool calls it had started still run, and the declined Turn's half-written text is saved as if it were a normal reply.

As a user, "continue" doesn't continue. After a Run pauses at the Turn limit, or after I press Stop, or after an error, the chat stores only my original message. When I type "continue", Claude gets `["buy my cart", "continue"]` and nothing about the pages it already visited or the buttons it already clicked, so it starts over. After a reload, the chat shows my message with no reply, and never shows the actions of any Run.

As a user, if the first Turn of my Run fails, for example because Anthropic is overloaded, my message disappears from the chat after a reload, even though a partial Turn may have been billed.

As a user with the same chat open in two side panels, two Runs at once mix their history: one Run's prompt picks up the other Run's message.

As a paid user on Sonnet or Opus near the end of my balance, I get "insufficient balance" in the middle of a Run while I still have several times the real cost of the Turn. A Sonnet 5.5 Turn that costs 4 Credits needs a 16-26 Credit balance today, and an Opus 5.5 Turn that costs 7 Credits needs 31-51 Credits. The Hold prices the whole prompt as if nothing were cached, but within a Run most of the prompt is a cache read.

As a user, long Runs get expensive. Every Turn resends every earlier page snapshot, and a snapshot has no size limit. On Haiku 5.5, a prompt over 100K tokens is billed at five times the normal rate, so a long Run on a big page costs far more than it should. The chat's context meter also tops out at 200K tokens, although every current model has a 1M window.

As the owner:
- Anyone can send the agent API a request of any size, made of any content.
- The production migration journal is out of sync, so `pnpm db:migrate` fails against production.
- The server strips one field from the blocks Claude returned before sending them back to Claude.
- The extension doesn't handle Claude pausing a Turn mid-search. That only matters once web search is turned on.
- The repo has six worktrees, two open PRs, eleven stale branches and uncommitted work in the main checkout.

## Solution

- **The server checks only the shape of tool calls it gets back.** An echoed tool call needs an id, a known tool name and an object input. The per-tool limits move to the extension, which checks each tool call before running it. If a tool call breaks a limit, the extension doesn't run it and tells Claude what was wrong, so Claude can try again with a valid value. Echoed blocks keep every field Claude returned.
- **Tools run only when a Turn ends normally.** The server hands tool calls to the extension only after the Turn has ended with Claude asking for tools. A Turn cut off by the output limit, or declined by Claude, runs no tools. A cut-off Turn ends the Run with the "reply was cut off" notice. A declined Turn's partial text is dropped from the Run's record and replaced by a short "Claude declined" note.
- **The last Turn of a Run runs no tools.** A Turn is a Run's last when it is Turn 20, or when its prompt has reached the Run budget. On that Turn, Claude is told to stop and summarise, and any tool call it still makes is never run. Its summary of what it did and what's left is the Run's reply. The extension shows a notice under it saying why the Run paused. "continue" then starts a fresh, small Run.
- **Every Run keeps a record of its progress.** My message is saved before the first Turn starts. After every Turn, the Run's reply in the chat is updated with Claude's text so far and the list of actions it took: tool names and inputs, with no page content. Stop and errors leave that record in place. A new Run, such as "continue", sees it. After a reload, the side panel shows each Run's actions.
- **One live Run per chat.** Each Run has an id: its opening message. The newest Run in a chat is the only one that can continue. An older Run still running in another side panel stops at its next Turn with a notice, and never writes into the newer Run's history.
- **The Hold expects the cache.** On the second and later Turns of a Run, the part of the prompt that the previous Turn already sent is priced as a cache read when the Hold is taken. If the cache missed, the existing overage settlement charges the difference, as it does today for any under-estimate.
- **Every request has a size limit.** The extension caps snapshots and images. The server rejects any request over 4 MB with a clear error and caps every field well above what the extension sends. An oversized tool result from an older build is shortened, not rejected, so it can't kill a Run.
- **The context meter uses each model's real window.**
- **The extension continues a Turn that Claude paused mid-search**, so web search can be turned on later without a broken loop.
- **The production migration journal records every applied migration**, so `pnpm db:migrate` works again.
- **Everything ships, and the repo ends clean.** PR #19, PR #18 and this work merge into `dev`, then `dev` merges into `main`. Every open issue is closed with a comment that says what was done. Every worktree and stale branch is removed, the main checkout is left on `main` with a clean tree, and extension 1.0.7 is uploaded.
- **Agents do all of it.** The owner decided on 2026-10-08 that agents carry out every step, including the merges into `main`. The owner only answers Claude Code's permission prompts for production database writes. If the session has no browser access to the owner's Chrome Web Store account, the owner also uploads the 1.0.7 zip.

## User Stories

1. As a user, I want my Run to keep going when Claude picks a scroll distance, a wait time or a URL that the tool definition allows, so that I don't lose a Run I've paid for.
2. As a user on an already-installed extension, I want that fix to work without updating the extension, so that I'm protected from the day the server deploys.
3. As a user, I want the extension to refuse to run a tool call whose input breaks the tool's limits, so that a bad value never reaches the page.
4. As a user, I want Claude to be told why a tool call was refused, so that it retries with a valid value instead of giving up.
5. As a user, I want a tool call with an empty or unparseable input never to run, so that the agent doesn't click or fill with nothing.
6. As a user, I want the agent never to act on the last Turn of a Run, so that no action happens that nobody checks.
7. As a user, I want the last Turn of a Run to tell me what the agent did and what's left, so that I can decide whether to say "continue".
8. As a user, I want a notice after that summary saying whether the Run paused at the Turn limit or because it grew too large, so that I know it paused rather than finished.
9. As a user on extension 1.0.5, I want my last Turn (Turn 10) to run no tools once the server is deployed, so that I'm protected without updating.
10. As a user, I want a Turn cut off by the output limit to run none of its tool calls, so that a half-written action never runs.
11. As a user, I want to be told when Claude's reply was cut off, including when it was cut off during a tool call, so that I know the answer is incomplete.
12. As a user whose balance lowered the output limit, I want the cut-off notice to say so, as it does today for text-only replies.
13. As a user, I want a Turn that Claude declines to run none of its tool calls, so that a refusal can't leave a half-started action.
14. As a user, I want a declined Turn's half-written text left out of my chat and replaced by a short note, so that I don't mistake it for an answer after a reload.
15. As a user, I want tool calls to appear in the side panel when the Turn ends, rather than earlier, if that is the price of never running a cut-off tool call.
16. As a user, I want my message saved as soon as my Run starts, so that it's still in the chat after a reload even if the first Turn fails.
17. As a user who runs out of balance before my Run starts, I want no orphan message left in the chat, so that a refused Run leaves no trace.
18. As a user who presses Stop, I want the Run's reply to keep the text Claude wrote and the actions it took up to that point, so that I can see what happened.
19. As a user whose Run hit an error, I want the same record of progress kept, so that I can see how far it got.
20. As a user, I want "continue" after a pause, a Stop or an error to know which pages the agent visited and what it clicked, so that it doesn't redo work.
21. As a user, I want the record of actions to contain only the actions and their inputs, not the content of the pages I visited, so that page content isn't stored.
22. As a user, I want one reply per Run in the chat, not one per Turn, so that the chat stays readable.
23. As a user, I want a Run that finishes normally to end with Claude's final answer as its reply, with the list of actions it took.
24. As a user reloading the side panel, I want each Run's actions shown under its reply, with failed actions marked, so that the chat looks the same as it did live.
25. As a user with the same chat open in two side panels, I want the older Run to stop with a notice when I start a new one, so that the two Runs never mix their history.
26. As a user on an older extension build, I want a second Run in the same chat to behave as it does today, so that the server change doesn't break me.
27. As a paid user on Sonnet or Opus with a small balance, I want a Turn allowed when my balance covers its expected cost, so that my Run doesn't stop early.
28. As a user, I want any cost above the Hold settled from my balance as today, so that billing stays exact even when the cache misses.
29. As a Free user on Haiku, I want my Runs to keep working with a 7-Credit Free grant.
30. As a user, I want a long Run on a big page to pause before its prompt reaches the long-prompt price, but only after at least 5 tool Turns with full-size snapshots, so that one Run neither costs five times what it should nor stops too early.
31. As a user, I want a page snapshot shortened when it is huge, with a hint for Claude to search it instead, so that one page can't fill the whole context.
32. As a user in a long chat, I want a new Run to see the most recent part of the chat rather than fail, so that an old chat stays usable.
33. As a user, I want the context meter to show how full the model's real window is, so that it doesn't read 100% at a fifth of the window.
34. As a user, I want an image that is too large refused when I attach it, with a clear message, so that I don't start a Run that will fail.
35. As a user, I want a Run that has grown too large to send to stop with a clear notice, not with "That image is too large".
36. As a user on an older extension build, I want an oversized tool result shortened rather than rejected, so that my Run doesn't die mid-way.
37. As the owner, I want every request to the agent API limited in size and in each field, so that nobody can send arbitrary amounts of data through my API key.
38. As the owner, I want Claude's blocks echoed back exactly as Claude returned them, so that the prompt cache and the thinking history check never see an edited block.
39. As the owner, I want a Turn that Claude paused mid-search continued automatically, so that turning web search on later doesn't leave Runs ending silently.
40. As the owner, I want every Turn still billed at its real cost plus the Margin, so that the cache-aware Hold changes when a Turn is allowed, not what it costs.
41. As the owner, I want a declined Turn billed as today, at its real cost plus the Margin with the Minimum charge, so that refusals can't become free Turns.
42. As the owner, I want no new database migration in this work, so that production schema changes stay out of the release.
43. As the owner, I want the production migration journal to record migrations 0001 to 0007, so that `pnpm db:migrate` works again before the next schema change.
44. As the owner, I want the server changes to work with extension 1.0.5, the version installed today, so that users who haven't updated aren't broken.
45. As the owner, I want all the extension changes shipped in one new version, 1.0.7, uploaded after the server deploys.
46. As the owner, I want no beta API feature in production, so that a beta change can't break the agent.
47. As the owner, I want every open GitHub issue closed with a comment saying what was done, and how the fix differs from the issue's suggestion where it does, so that the tracker is empty and honest.
48. As the owner, I want PR #18 and PR #19 merged into `dev` before this work, so that it builds on them.
49. As the owner, I want one release PR from `dev` to `main`, with every fixed issue listed so that GitHub closes it on merge.
50. As the owner, I want agents to do every step, including the merges into `main`, with each production database write going through Claude Code's permission prompt, so that I don't have to run anything myself.
51. As the owner, I want every worktree removed, every merged or superseded branch deleted locally and on GitHub, and the main checkout left on `main` with nothing uncommitted, so that no code is left on disk.
52. As the owner, I want the spec and tickets committed with the work and deleted in a final commit, so that they are in the history but not in the tree.
53. As a developer, I want the server-side tool-call check and the extension's input limits to have one source of truth for each tool's limits, so that they can't drift apart again.
54. As a developer, I want every size limit defined once in the shared package, so that the extension's caps and the server's caps can't contradict each other.
55. As a developer, I want each fix covered by a test at the agent chat route or the side-panel agent loop, so that the bugs can't come back unnoticed.

## Implementation Decisions

**Echoed tool calls (#5, #13)**
- The shared request schema validates an echoed `tool_use` by shape only: string id, name from the tool-name enum, input a JSON object. The per-tool `superRefine` on the echo path is removed.
- The per-tool input schemas stay in the shared package. They become the extension's check before a tool runs, and their limits match what the tools actually do. For example, the wait tool already clamps to 30 seconds, so the schema allows larger values and the tool clamps them.
- In the side-panel agent loop, each tool call's input is checked against its tool's input schema before execution. On failure the tool isn't executed. The loop records a `tool_result` with `is_error: true` and a message that names each invalid field, so Claude can retry. Tools without an input schema run as today.
- The tool JSON schemas sent to Claude are not changed. `strict` and `minimum`/`maximum` are not used. The extension's check replaces them (#5 suggested them).
- The `tool_use`, `server_tool_use` and `web_search_tool_result` schemas model the optional `caller` field as an open object, `{type: string}` with any other fields kept. An echoed block is then byte-for-byte what Claude returned, and a new caller type can't become a 400 mid-Run. This settles #13: stripping it was deterministic and couldn't cause cache misses, but keeping it removes the question for the thinking history check.

**Releasing tool calls only at a clean end of Turn (#7, #10)**
- The agent chat route collects client tool calls while it streams.
  - It sends the `tool_use` events only after the stream has ended, and only when the stop reason is `tool_use`.
  - It sends them before `citations`, `execution_complete` and `done`. Extension 1.0.5 treats `execution_complete` as the final answer when it has seen no tool call yet.
- A Turn that ends any other way (Stop, error, `max_tokens`, `refusal`, or a last Turn) released no tool calls, so none of them ran. That Turn adds none of its tool calls to the Run record: only its text, or for `refusal` only the declined note.
- On `max_tokens`, no `tool_use` events are sent. The `done` event carries stop reason `max_tokens` and content blocks without the cut-off tool call. Extensions already in use then emit the "reply was cut off" notice and end the Run, so no extension change is needed.
- On `refusal`, no `tool_use` events are sent. The existing `MODEL_REFUSED` error event is unchanged. The Run record leaves out the refused Turn's text and tool calls and appends a fixed note that Claude declined. Billing is unchanged: the refused Turn costs its real cost plus the Margin, with the Minimum charge (owner's decision, 2026-10-08).
- Server-tool events (`web_search_*`) are unchanged.
- The Run record saved for a cut-off Turn holds only its text, never the cut-off tool call.

**The last Turn of a Run (#4, #12)**
- A Turn is the Run's last when any of these holds:
  - **Turn limit:** the request carries at least `MAX_AGENT_TURNS - 1` (19) earlier Turns.
  - **Legacy Turn limit:** the request has no `runId` and carries at least `LEGACY_MAX_AGENT_TURNS - 1` (9) earlier Turns. Every request without `runId` comes from 1.0.5, whose limit is 10. Ticket 01 checks that 1.0.6 never reached the Chrome Web Store; if it did, this rule is dropped, because 1.0.6 has a limit of 20 and also sends no `runId`.
  - **Run budget:** the Turn's estimated prompt is at least `RUN_BUDGET_TOKENS` (90,000), measured with the Hold's estimator.
    - That estimator deliberately over-counts by 1.75-2x, so 90,000 estimated tokens are roughly 50-80K real ones. That stays under Haiku 5.5's 100K long-prompt tier even after the last Turn's growth, and the rule applies to every model.
    - With the snapshot cap and history window below, a Run of full-size snapshots still gets at least 5 tool Turns.
- On the last Turn the server appends a mid-conversation system message after the last tool results. It tells Claude that this is the last Turn of the Run, that it must not call tools, that it should summarise what it did and what's left, and that the user can say "continue".
  - `tool_choice` stays `auto` and the tools list is unchanged. Changing `tool_choice` would invalidate the messages cache, and that cache-write on the largest prompt of the Run would cost 10-20x the Hold on Sonnet.
  - The server releases no tool calls on a last Turn, whatever Claude does, and records none. If Claude calls a tool anyway, the Run still ends, its text (if any) is the reply, and the notice still follows.
  - All three current models accept mid-conversation system messages without a beta.
- If the newest Turn has no tool results (a `pause_turn` resume), the last-Turn rules wait for the next Turn with tool results. A system message can't follow an assistant message.
- The `done` event of a last Turn carries `runEnd: "turn_limit" | "run_budget"`. Older builds ignore it, and with no tool calls they end the Run normally.
- The Turn ends normally, so the server saves its text as the Run's reply.
- Extension (defence in depth against an older server):
  - On the last allowed Turn, the loop doesn't execute tool calls. A `pause_turn` on the last allowed Turn ends the Run with the Turn-limit notice instead of resuming.
  - When the Run ends with `runEnd`, or after using all its Turns, the loop emits a notice after the reply: the Turn limit notice, or a new Run-budget notice.
- No server-side context editing: it is beta (#12 suggested it). The Run budget, the snapshot cap and the history window keep Runs under the long-prompt tier without it.

**History window for a new Run (#12)**
- The window is the newest rows **strictly older than the Run's opening row** whose rendered size fits `HISTORY_BUDGET_TOKENS` (20,000 estimated). The opening message isn't counted, and it is always sent.
- The same function runs on Turn 1 (on the locked read) and on every continuation (on the rows before the `runId` row, or before the last user row for legacy builds). Turn 1 and Turn 2 therefore send byte-identical messages before the opening message. Any difference would be a cache miss, and with thinking on the 5.5 models it would be a 400.
- The newest earlier row is always included, so "continue" never loses the previous Run's record. When any assistant row is rendered into a prompt:
  - each action's input JSON is capped at 300 chars;
  - the row's text is capped at 8,000 chars, keeping the head and the tail.

**Run progress record (#9, #16, #15)**
- **Run start**, in this order:
  1. Read the history without locking.
  2. Plan the Hold and take it. A 402 or a `BALANCE_HELD` 409 returns here, before anything is written.
  3. In one transaction: lock the chat row (`SELECT … FOR UPDATE`), re-read the history, and insert the user's message row with `clock_timestamp()`, not `now()`, so rows keep their real order under the lock.
  4. Build the prompt from the locked read. The Hold estimate may differ slightly from that prompt, and the overage path covers the difference.
  - If the start transaction fails, the Hold is settled at zero before the 500 is returned.
  - Retrying after a failed first Turn leaves two user rows. This is accepted.
- **Run id:** the opening user row's id. The `session_created` event carries it as `runId`. New extension builds send `runId` on every continuation.
  - The shared request schema adds it as an optional uuid. Older servers strip it.
- **The Run's assistant row:**
  - It is the first assistant row created after the Run's opening row.
  - It is inserted at the end of the first Turn that produced text or tool calls, and updated at the end of every later Turn: in the billing transaction on a normal end, and in the unfinished-Turn settlement on Stop, disconnect or error.
  - Content is the visible text of the Run so far.
  - The tool-calls column holds every tool call the server released to the extension, oldest first. It uses the existing `ToolCall` shape (`type`, `id`, `name`, `input`, optional `isError`). A call's `isError` is filled in from its `tool_result` when the next continuation arrives. Tool results are never stored.
  - A small shared stored-tool-call schema validates that column wherever it is read. No casts.
  - Older builds that send only the latest Turn get their record appended to the stored row, not recomputed from the request.
  - For a request without `runId`, the assistant row is updated only if it doesn't exist yet, or if its stored tool-call ids are a prefix of the request's `tool_use` ids. Otherwise the record write is skipped and billing still settles. Two legacy Runs in one chat therefore never overwrite each other's row.
- **Lock order:** every transaction that writes a Run's record locks the chat row first, then the user row. The billing transaction is reordered to match.
- **One live Run per chat:**
  - The live Run is the chat's newest user row.
  - A continuation whose `runId` is not the newest user row gets 409 `RUN_SUPERSEDED`. The new extension ends that Run with a notice that the chat continued in another panel.
  - A superseded Run still settles its billing, but skips its record write.
  - Accepted loss: with Stop and a fast "continue", the stopped Turn's partial record can be lost if the new Run takes the lock first. Earlier Turns are already recorded.
- **Continuation history:** a continuation that carries `runId` uses the rows up to and including the `runId` row. A continuation without `runId` (older builds) keeps today's rule: drop a trailing assistant row.
- **A new Run's prompt:** an assistant row with tool calls is rendered as its text followed by a compact list of the actions taken (tool name and input). This is how "continue" gets memory.
- **Display after a reload:**
  - The side panel renders stored tool calls under the reply when a message has no live parts, using the existing collapsible tool-call view, with failed calls marked.
  - The live view also passes the error state through, which it drops today.
- The route answers 404, not 403, for a chat the user doesn't own, as the coding standards require.
- No schema change: `messages` already has a text content column and a JSON tool-calls column.

**Cache-aware Hold (#11)**
- The credit reservation plan takes the estimated prompt as two parts:
  - **Cached prefix:** priced at the cache-read rate.
  - **The rest:** priced at the cache-write rate. Automatic caching writes the rest, so that rate is the correct worst case.
- For a continuation that sends `previousTurns`, the cached prefix is everything the previous Turn of the Run sent: system, tools, the history window, the opening message, and every earlier Turn except the newest one.
- First Turns and the legacy single-Turn form price the whole prompt at the cache-write rate, because their whole prompt is written to the cache.
- Settlement is unchanged. A cache miss settles above the Hold through the existing overage path.
- Add **Hold** to the glossary under Billing: "The Credits set aside from a user's balance before a Turn starts, sized to the most the Turn could cost. When the Turn ends, the unused part is returned and anything above it is charged. _Avoid_: Reservation, pre-auth."

**Size limits (#8, #12)**
- All limits live in one shared constants object next to `MAX_AGENT_TURNS`. The extension and the server import it.
- Extension caps:
  - Snapshot text 20,000 chars, shortened with a note telling Claude to use `search_snapshot`.
  - Each snapshot node's name and value 200 chars.
  - Page content 15,000 chars (existing).
  - Attached image 2,000,000 base64 chars, refused at attach time with a clear message. Its media type is validated instead of cast.
- Server caps, each well above the extension's:
  - Any request body over 4,000,000 bytes gets a 413 `REQUEST_TOO_LARGE` with a JSON message. The route checks `Content-Length` before parsing the body, and checks the real length when the header is missing.
  - Text, thinking and signature fields are capped at 200,000 chars.
  - Tool input is capped at 100,000 chars, measured on its JSON text.
  - Ids are capped at 256 chars.
  - Blocks and tool results are capped at 100 per Turn.
  - Image base64 is capped at 3,000,000 chars.
  - A tool result longer than 200,000 chars is shortened by the server, the same way every time, rather than rejected. Shortening the same input the same way keeps the prompt stable, and an older build's huge snapshot can't kill a Run.
- Before each request, the extension checks the request's size in bytes (UTF-8, not string length) against the same 4,000,000-byte limit. If the Run has grown too large, it ends with a clear notice instead of "That image is too large". Vercel's own 413 has no JSON body and never reaches the route.
- Accepted: a 1.0.5 request between 4.0 and 4.5 MB works today and gets 413 after the deploy. #8's closing comment says so.
- Fabricated assistant Turns are not signed or verified. Tool results are written by the client anyway, so signing Claude's own blocks would add no protection, and every token is billed to the sender. #8's closing comment says so.

**Context meter (#12)**
- Each model's context window (1M tokens for all three current models) is defined on the shared model config. The server's context clamp and the side panel's meter both use it instead of the fixed 200K.

**`pause_turn` (#14)**
- When `done` carries `pause_turn`, the extension doesn't end the Run. It appends Claude's content as a Turn with no tool results and continues. That counts toward the Turn limit. On the last allowed Turn it ends the Run instead (see "The last Turn of a Run").
- The server already accepts that shape, and records a paused Turn like any other.
- The `execution_complete` event of a paused Turn is not shown as the final answer.
- Web search stays off. This only removes the blocker for turning it on.

**Production migration journal (#17)**
- `drizzle.__drizzle_migrations` in production gets one row for each of 0001 to 0007: the file's sha256 and the journal's `when` as `created_at`.
  - Before the insert, a read-only check confirms that each migration's schema is really present.
  - The hash variant (LF or CRLF) is the one that matches the existing 0000 row.
- After the insert, a read-only check confirms that `max(created_at)` is at least the largest `when` in the journal. drizzle 0.38.4 compares only that value. Only then does the agent run `pnpm db:migrate`, which must find nothing to apply.
- The agent runs every production write itself, and Claude Code's permission prompt asks the owner to allow it.
- The two stray SQL files that aren't in the journal move to `docs/db/legacy-sql/`. `0001_rls_policies.sql` may describe policies that are live.

**Extension version**
- `origin/main` is at 1.0.5. PR #19's 1.0.6 was most likely never uploaded to the Chrome Web Store. Ticket 01 confirms this by reading the version on the public store listing.
- All side-panel changes ship as 1.0.7, with release notes that replace the 1.0.6 section.
- The 1.0.7 zip is built with the production config: `build:prod`, using the env files from the main checkout. Its bundle is checked for the production URL, a live Clerk key and no `localhost`.

**Docs to update (in the same PR as the code they describe)**
- `GLOSSARY.md`: add **Hold** (above), and **Run budget**: "The estimated prompt size at which a Run's next Turn becomes its last: 90K by the Hold's deliberately high estimate, roughly 50-80K real tokens. _Avoid_: Context limit, prompt budget."
- `.claude/docs/patterns.md`:
  - The note that credit reservations deliberately ignore caching becomes the cache-aware rule.
  - The agent-loop section gains these rules:
    - Tool calls are released only after a `tool_use` stop.
    - The last Turn of a Run gets a system message and releases no tool calls. `tool_choice` is never changed, because that invalidates the cache.
    - Each Run keeps one assistant row, updated every Turn.
    - The live Run is the chat's newest user row.
    - Size limits come from the shared constants.
- `.claude/docs/pricing-model.md`: the Reserve step prices the cached prefix of a continuation at the cache-read rate.
- `.claude/docs/database-schema.md`:
  - `messages` gets one assistant row per Run, updated after every Turn.
  - `tool_calls` holds the Run's tool calls with an optional `isError`, and never tool results.
  - The migration journal is complete, and new migrations go through `db:migrate` before merging to `main`.
- `ARCHITECTURE.md`: the SSE flow sends `tool_use` events after the Turn ends, not mid-stream, and `session_created` carries `runId`.

**Release and repo cleanup**
- **Owner's decisions (2026-10-08):**
  - Keep the deletion of four skills: `open-source`, `qstash`, `skill-creator` and `workflow`. It goes into PR #18.
  - Drop the superseded per-user in-flight cap branch.
  - Delete `ref`.
  - Discard the three probe tests.
- **Merge order:**
  1. PR #18 is retargeted from `main` to `dev`.
  2. PR #19 merges into `dev` first.
  3. `dev` is merged into PR #18's branch, and the single conflict in `CLAUDE.md` is resolved by taking #18's version. Then PR #18 merges into `dev`.
  4. `fix/agent-loop` is rebased on `dev`, opened as a PR, and merged into `dev`.
  5. One release PR goes from `dev` to `main`. The agent merges it once checks pass; the owner authorized this on 2026-10-08. `dev` is then fast-forwarded to `main`.
  6. The agent uploads 1.0.7 through the owner's Chrome (Claude in Chrome), if the session has it. Otherwise it leaves `prophet-1.0.7.zip` on the owner's Desktop and says so.
- **Release PR body:** it lists `Closes` for #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14, #15 and #16. GitHub closing keywords fire only on merges into `main`. #17 is closed by hand after its production check.
- **Closing comments:**
  - Every issue gets one that says what shipped.
  - Where the fix differs from the issue's suggestion, the comment says how and why:
  - #5: no `strict`.
  - #6: no server-side Run counter, because every Turn is billed and rate-limited.
  - #8: no signing, and the 4.0-4.5 MB requests from 1.0.5 that are now refused.
  - #12: no context editing.
  - #13: `caller` is modelled rather than using `.passthrough()` on whole blocks.
- **Production checks before the release merge:** migrations 0006 and 0007 are applied, and the journal is fixed. Vercel deploys `main` automatically, and this work adds no migration.
- **Final cleanup:**
  - Every worktree is removed: `prophet-agent-loop`, `prophet-dev`, `prophet-pricing`, `prophet-seo`, and the scratch `pr19` worktree.
  - Every merged or superseded branch is deleted locally and on `origin`.
  - The main checkout's uncommitted copies are discarded once they are in a PR. It is left on `main`, pulled, with `git status` clean.
  - Only `main` and `dev` remain.

## Testing Decisions

- Work test-first (`/tdd`): failing test at the seam, make it pass, refactor.
- Good tests assert external behaviour only:
  - the HTTP status and SSE events the route returns;
  - the rows in the database;
  - the request sent to the mocked Anthropic client;
  - the balance after settlement;
  - the events and requests of the side-panel agent loop.

  They don't assert internal helpers or SQL text.
- Two seams, both existing:
  1. **Agent chat route** with pglite and a mocked Anthropic stream. Use the pglite route test files (credits, errors, caching), not the ones that mock the database. Prior art: those files, and the probe tests from the 2026-10-08 verification. It covers:
     - the six echoed inputs from #5 return 200, and an echoed `caller` reaches Anthropic unchanged;
     - no `tool_use` event and no stored cut-off tool call on `max_tokens` and on `refusal`, and a refused Turn's text not stored;
     - the system message, no released tool calls and `runEnd` on Turn 20, on a legacy Turn 10 and on a Turn over the Run budget, and their absence on Turn 19 and under the budget; `tool_choice` never changes;
     - a Run of 20,000-char snapshot results gets at least 5 tool Turns before the Run budget;
     - a `pause_turn` resume never gets the system message;
     - the history window drops the oldest rows of a long chat, always keeps the newest earlier row and the opening message, and Turn 1 and Turn 2 send byte-identical messages before the opening message;
     - two legacy Runs in one chat never overwrite each other's record;
     - the user row exists after a failed first Turn, and no user row after a 402;
     - the Run's assistant row after a tool-use Turn, after a Stop (aborted request) and after an error;
     - a later Run's prompt contains the earlier Run's actions;
     - a continuation with an older `runId` gets 409 `RUN_SUPERSEDED`, writes no record, and the newer Run's prompt doesn't contain it;
     - the Sonnet balance boundary for a Turn with a large cached prefix: allowed at a balance that covers the cached cost, still 402 below it;
     - a body over 4 MB gets 413 `REQUEST_TOO_LARGE`, an oversized tool result is shortened the same way on two Turns, and oversized model fields get 400;
     - the chat's stored context uses the model's window;
     - another user's chat gets 404.
  2. **Side-panel agent loop** with mocked fetch and background bridge. Prior art: the existing agent-loop tests and the `agent-loop.probe.test.ts` probe. Lift the SSE test helpers to file scope. It covers:
     - an invalid tool input isn't executed, and the next request carries an `is_error` result;
     - on the last allowed Turn no tool runs;
     - the right notice follows the reply when the Run ends by Turn limit or by Run budget;
     - a `pause_turn` on the last allowed Turn ends the Run instead of resuming;
     - `runId` from `session_created` is sent on every continuation, and `RUN_SUPERSEDED` ends the Run with its notice;
     - a `pause_turn` Turn continues with no tool results;
     - an over-size request is not sent and ends the Run with its notice;
     - an over-size snapshot is shortened with the search hint.
- Pure units are tested only where they already have tests: the credit reservation plan and the shared tool input schemas.
- The reload rendering of stored tool calls gets a component test next to the existing side-panel component tests. A `useAgentChat` hook test shows each new notice after the reply. Mock mode bypasses the agent loop, so it doesn't count as a test.
- The real-contention case of the chat lock may use the opt-in Docker Postgres test backend that the credit reservation tests already have. It isn't required in CI.

## Out of Scope

- Turning on web search. Only its `pause_turn` blocker is fixed.
- Server-side context editing, or any other beta API feature.
- `strict` tool definitions and `minimum`/`maximum` in the tool JSON schemas.
- Signing or verifying assistant Turns.
- A server-side Run counter.
- A per-user cap on concurrent requests. The in-flight cap branch is superseded by the Hold and is deleted.
- Storing tool results or page content for Runs.
- Any database schema change.
- The duplicate dev agent route, which mirrors the main route for mock mode. Keep it compiling. Behaviour changes go to the main route only, except the 200K context clamp, which both use from the shared model config.

## Further Notes

- **Worktree setup.** The worktree has no `node_modules` and no env files. Ticket 01 runs `pnpm install` and copies the gitignored env files from the main checkout without printing them.
- **Local runs hit production.** `.env.local` points at the production database.
  - The implementing session may run read-only SQL and start the local server with the owner's own account.
  - Production writes (#17) are run by the agent through Claude Code's permission prompt.
  - Verify behaviour with the pglite route tests and the side-panel loop and hook tests.
  - Don't run `pnpm test:agent`: it calls Anthropic and writes to production.
- **Compatibility:** the server must keep working with extension 1.0.5 throughout:
  - legacy request forms;
  - no `runId`;
  - uncapped snapshots, which are shortened server-side;
  - a Turn limit of 10, whose last Turn the legacy rule covers.
- Verification numbers (2026-10-08):
  - On `dev`, 13 of 14 probe tests failed, which confirms #4, #5, #7, #9, #15 and #16.
  - The Hold sweep on PR #19, for Turn 6 of a Run with about 40k prompt tokens and about 90% cache reads: Haiku 5.5 needs a 1-2 Credit balance for a 1-Credit Turn, Sonnet 5.5 needs 16-26 for 4, and Opus 5.5 needs 31-51 for 7.
- The Anthropic guidance this follows:
  - Validate tool input before running a tool, and return an error result on failure.
  - On `max_tokens` with a `tool_use` block, don't run the tool.
  - On `refusal`, never run that Turn's tools, and drop its partial output.
  - On `pause_turn`, resend Claude's content as is.
- Research notes from 2026-10-08 (repo state, issues audit, API facts, code facts) were in a session scratchpad. Everything decided from them is in this spec and its tickets.
