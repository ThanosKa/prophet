# Sidepanel release notes

The extension version lives in `manifest.ts`. Newest release first.

## 1.0.6

- The agent runs up to 20 Turns before it pauses and waits for you to say "continue" (was 10). The pause message states the real Turn limit.
- Claude Haiku 5.5 is the default model; saved model choices are migrated.

**Deploy order:** deploy the server (marketing app) before uploading this build to the Chrome Web Store. A server still on the 10-Turn limit rejects every request of a Run after its 11th Turn.
