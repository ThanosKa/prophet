# 08 · Last Turn without tools, Run budget, history window

Blocked by: 06 · Issues: #4 (server part), #12

## What to build
The decisions are in the spec, under "The last Turn of a Run (#4, #12)" and "History window for a new Run (#12)".

- **Shared constants**, next to `MAX_AGENT_TURNS`:
  - `RUN_BUDGET_TOKENS = 90_000` (measured with the Hold's estimator)
  - `HISTORY_BUDGET_TOKENS = 20_000`
  - `LEGACY_MAX_AGENT_TURNS = 10`
- **When a Turn is a Run's last.** Any of these makes it the last Turn:
  - The request carries at least 19 earlier Turns.
  - The request has no `runId` and carries at least 9 earlier Turns. Drop this rule if ticket 01 found 1.0.6 in the store.
  - The Turn's estimated prompt is at least `RUN_BUDGET_TOKENS`.
- **What a last Turn does:**
  - Append a mid-conversation `role: "system"` message after the last tool results. It says this is the Run's last Turn, tells Claude not to call tools, asks it to summarise what was done and what's left, and says the user can say "continue".
  - Leave `tool_choice` and the tools list unchanged. Changing `tool_choice` invalidates the messages cache.
  - Release no tool calls and record none, even if Claude makes some.
  - The `done` event carries `runEnd: "turn_limit" | "run_budget"`.
- **Paused Turns.** If the newest Turn has no tool results (a `pause_turn` resume), don't apply the last-Turn rules to it.
- **History window:**
  - The window is the newest rows strictly older than the opening row whose rendered size fits `HISTORY_BUDGET_TOKENS`.
  - The opening message isn't counted toward that budget, and it is always sent.
  - The newest earlier row is always included.
  - The same function runs on Turn 1, using the locked read, and on every continuation, using the rows before the `runId` row (or before the last user row for legacy builds).
- **No beta features.**
- **Docs:**
  - `GLOSSARY.md`: add **Run budget**, worded as in the spec.
  - `.claude/docs/patterns.md`: add the last-Turn rule.

## Acceptance criteria
- [ ] Route test: a request with 19 earlier Turns:
  - carries the system message;
  - leaves `tool_choice` unchanged;
  - releases no `tool_use` event, even when the mock calls a tool;
  - ends with `runEnd: "turn_limit"`.

  A request with 18 earlier Turns does none of these.
- [ ] Route test: a request with no `runId` and 9 earlier Turns is a last Turn. With a `runId`, it isn't.
- [ ] Route test: a continuation estimated over 90K ends with `runEnd: "run_budget"`. One just under 90K doesn't.
- [ ] Route test: a Run whose Turns each return a 20,000-char snapshot gets at least 5 tool Turns before reaching the Run budget.
- [ ] Route test: a `pause_turn` resume (no tool results) never gets the system message.
- [ ] Route test, in a chat whose history is larger than the window:
  - only the newest rows are sent, plus the newest earlier row and the opening message;
  - Turn 1 and Turn 2 send byte-identical messages before the opening message.
- [ ] Route test: the last Turn's text is saved as the Run's reply.
