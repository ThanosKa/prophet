# 04 · Echo tool calls by shape only, keep `caller`

Blocked by: 03 · Issues: #5 (server part), #13

## What to build
See the spec section "Echoed tool calls (#5, #13)".
- **Shape-only check.** The shared request schema accepts an echoed `tool_use` by shape only: a string id, a known tool name and an object input. Remove the per-tool `superRefine` from the echo path.
- **Per-tool input schemas.** Keep them exported, because the extension uses them in ticket 11. Loosen their limits to match what each tool really does, and read each tool's implementation to set the limit:
  - `scroll_page` accepts negative pixels.
  - The wait tools accept any non-negative number, because the tool clamps it.
  - `navigate` and `open_new_tab` accept a URL without a scheme, because the tool adds `https://`.
- **`caller` field.** Model the optional `caller` field on the `tool_use`, `server_tool_use` and `web_search_tool_result` schemas as an open object: `{type: string}`, with any other fields kept. Echoed blocks then reach Anthropic unchanged, and a new caller type can't cause a 400.

## Acceptance criteria
- [ ] Route test (pglite): a continuation that echoes each of the six inputs from #5 returns 200, not 400. The six inputs are `pixels: -500`, `ms: 90000`, `ms: 1500.5`, a URL without a scheme for `navigate`, the same for `open_new_tab`, and a long `search_snapshot` query.
- [ ] Route test: an echoed `tool_use` with `caller: {type: "direct"}` reaches the mocked Anthropic request with `caller` intact.
- [ ] The shared schema tests cover the new per-tool limits.
- [ ] A request shaped like extension 1.0.5's still passes.
