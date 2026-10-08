# 05 · Release tool calls only after a clean end of Turn

Blocked by: 04 · Issues: #7, #10

## What to build
See the spec section "Releasing tool calls only at a clean end of Turn (#7, #10)".

- **Release tool calls at the end.** Collect client tool calls during the stream. Send the `tool_use` events only when the stop reason is `tool_use`, after `finalMessage()`. Send them before `citations`, `execution_complete` and `done`: extension 1.0.5 treats `execution_complete` as the final answer when it has seen no tool call.
- **On `max_tokens`:**
  - Send no `tool_use` events.
  - `done` carries `max_tokens` and the content blocks without the cut-off tool call.
  - No tool call of that Turn is stored.
- **On `refusal`:**
  - Send no `tool_use` events. The `MODEL_REFUSED` error event stays as it is.
  - Don't store the refused Turn's text or tool calls as a reply. Ticket 06 adds the declined note; until then, store nothing for that Turn.
  - Billing stays as it is: real cost plus the Margin, with the Minimum charge.
- **Server tools.** `web_search_*` events stay as they are.
- **Docs.**
  - `ARCHITECTURE.md`: `tool_use` is sent after the Turn ends.
  - `.claude/docs/patterns.md`: tool calls are released only after a `tool_use` stop.

## Acceptance criteria
- [ ] Route test: when a stream ends with `tool_use`, the `tool_use` events come after the last content event and before `execution_complete`.
- [ ] Route test: on `max_tokens` with a partial `tool_use`, there is no `tool_use` event, `done.stopReason` is `"max_tokens"`, and no tool call of that Turn is stored.
- [ ] Route test: on a `refusal` after a `tool_use` block, there is no `tool_use` event, the refused text isn't stored, and billing is as before.
