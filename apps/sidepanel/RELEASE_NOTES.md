# Sidepanel release notes

The extension version lives in `manifest.ts`. Newest release first.

## 1.0.7

1.0.6 was never uploaded to the Chrome Web Store, so this release also carries its changes.

From 1.0.6:
- The agent runs up to 20 Turns before it pauses and waits for you to say "continue" (was 10). The pause message states the real Turn limit.
- Claude Haiku 5.5 is the default model; saved model choices are migrated.
- The balance in the account menu notes how much of it is Purchased credits that never expire.

Agent loop:
- The last Turn of a Run runs no tools, and Claude answers instead. Long Runs also pause at the Run budget before the prompt gets expensive. Both show a notice after the reply; send "continue" to keep going.
- Every continuation of a Run carries its `runId` from `session_created`. A Run that another side panel replaced stops with a notice instead of an error.
- A `pause_turn` no longer ends the Run: the extension resumes it.
- Tool inputs are checked against their schema before a tool runs; an invalid call is reported back to Claude instead of running.
- A request over 4 MB isn't sent; the Run stops with a "grew too large" notice instead of "That image is too large".

Size limits and display:
- Page snapshots are capped at 20,000 characters, with a hint for Claude to use `search_snapshot`; each element's name and value at 200 characters.
- An image too large to send (over about 1.5 MB), or not JPEG, PNG, GIF or WebP, is refused when you attach it, with a message.
- The context meter measures the chat against the model's real 1M-token window instead of 200K.
- After a reload, each reply shows the actions its Run took, with failed actions marked. Failed actions are also marked live.

**Deploy order:** deploy the server (marketing app) before uploading this build to the Chrome Web Store. This build sends `runId` and relies on the server's Run record, last-Turn rule and size limits; an older server rejects every request of a Run after its 11th Turn.
