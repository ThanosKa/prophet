# 10 · Size limits and real context windows

Blocked by: 04 · Issues: #8, #12 (context meter)

## What to build
See the spec sections "Size limits (#8, #12)" and "Context meter (#12)". This ticket covers the shared constants and the server. Ticket 12 applies the extension caps.

- **Shared limits object**, next to `MAX_AGENT_TURNS`:

  | Limit | Value | Enforced by |
  |---|---|---|
  | Snapshot | 20,000 chars | extension |
  | Node name or value | 200 chars | extension |
  | Page content | 15,000 chars | extension |
  | Image | 2,000,000 chars | extension |
  | Tool result | 200,000 chars | server |
  | Text, thinking or signature | 200,000 chars | server |
  | Tool input (JSON) | 100,000 chars | server |
  | Id | 256 chars | server |
  | Blocks per Turn | 100 | server |
  | Tool results per Turn | 100 | server |
  | Image | 3,000,000 chars | server |
  | Request | 4,000,000 bytes | server and extension |

- **Request size.**
  - Check `Content-Length` before parsing the body.
  - When the header is missing, check the body's real byte length.
  - Over the limit, return 413 `REQUEST_TOO_LARGE` with a JSON message.
- **Field caps** go in the shared request schema. A tool result over its cap is shortened with a short note instead of rejected. The shortening is deterministic: the same input always gives the same output.
- **Context windows.** Add each model's context window to the shared model config: 1M for Haiku, Sonnet and Opus 5.5 (confirm with the claude-api skill). The context clamp uses it in both the main and the dev agent routes.
- **Docs.** In `.claude/docs/patterns.md`, say that size limits come from the shared constants.

## Acceptance criteria
- [ ] Route test: a body over 4,000,000 bytes gets 413 `REQUEST_TOO_LARGE` with JSON.
- [ ] Route test: an over-cap tool result is shortened identically on two consecutive Turns, and the two Anthropic requests share the prefix.
- [ ] Route test: an over-cap text block or tool input gets 400.
- [ ] Route test: the chat's stored context is clamped by the model's window.
- [ ] A request shaped like 1.0.5's, with a 250K-char snapshot result, still returns 200.
