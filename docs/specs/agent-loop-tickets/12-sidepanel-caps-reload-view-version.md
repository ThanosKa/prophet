# 12 · Side panel: caps, reload view, 1.0.7

Blocked by: 10, 11 · Issues: #8, #9, #12 (extension parts)

## What to build
- **Snapshot cap.**
  - Cap `take_snapshot` output at the shared snapshot limit, and add a note telling Claude to use `search_snapshot`.
  - Cap each node's name and value at the shared node-text limit, in snapshots and in `search_snapshot` rows.
  - `get_page_content` uses the shared constant.
- **Image cap.**
  - When the user attaches an image over the shared limit, refuse it with a clear message.
  - Validate the media type instead of casting it.
- **Context meter.** Use the active model's context window from the shared model config.
- **Reload view.**
  - When a stored message has no live parts, render its stored tool calls with the existing collapsible tool-call component.
  - Validate them with the shared stored-tool-call schema, and mark failed calls.
  - The live parts path passes the error state through.
- **Version 1.0.7.**
  - Bump the manifest and the package to 1.0.7.
  - In the side panel's release notes, replace the never-uploaded 1.0.6 section with a 1.0.7 section. Include the 1.0.6 changes, and the note that the server deploys first.

## Acceptance criteria
- [ ] Test: an over-size snapshot is shortened with the hint, and node text is capped.
- [ ] Component test: an over-size image is refused with the message.
- [ ] Component test: a reloaded message with stored tool calls shows them, with an error mark where `isError` is true.
- [ ] Store or component test: the meter's denominator is the model's window.
- [ ] The extension builds with `build:prod`.
