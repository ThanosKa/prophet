# Development Scripts

## Test Agent Endpoint

Quick test script for the dev-only agent endpoint.

### Usage

```bash
# From project root:
pnpm test:agent

# Or directly:
./scripts/test-agent.sh
```

### What it tests

1. ✅ Haiku model (default)
2. ✅ Sonnet model (explicit)
3. ✅ Tool use (navigation)
4. ✅ Full streaming response

---

## Logs: Where Are They?

### Development (Local)

**Normal workflow** - Logs appear in your **terminal**, NOT in files:

```bash
# Terminal 1: Start backend (you'll see logs here)
pnpm -F @prophet/backend dev

# Terminal 2: Start sidepanel
pnpm -F @prophet/sidepanel dev

# Terminal 3: Test with curl
pnpm test:agent
```

**What you'll see in Terminal 1 (backend):**
```
[10:48:42.135] DEBUG: [DEV] Starting agent stream
    model: "claude-haiku-4-5"
    messageCount: 1
[10:48:42.907] INFO: [DEV] Agent stream completed
    model: "claude-haiku-4-5"
    inputTokens: 2745
    outputTokens: 5
```

### Why No Log Files in IDE?

**In development:**
- ❌ Logs are NOT saved to files/folders by default
- ✅ Logs go to **stdout/stderr** (terminal output)
- ✅ You see them in real-time where you run `pnpm dev`
- 🎯 **This is normal!** Developers read logs in the terminal

**In production (deployed):**
- ✅ Logs ARE saved to files or log services
- ✅ Examples: CloudWatch (AWS), Datadog, Vercel Logs, etc.
- ✅ Persistent storage for debugging issues

### How to View Logs

**Option 1: Terminal (recommended for dev)**
```bash
# Just run the dev server in a terminal - you'll see logs
pnpm -F @prophet/backend dev
```

**Option 2: Save to file (if you prefer)**
```bash
# Redirect logs to a file
pnpm -F @prophet/backend dev > logs/backend.log 2>&1

# View logs in real-time
tail -f logs/backend.log
```

**Option 3: Use IDE Terminal**
Most IDEs (VS Code, Cursor, etc.) have built-in terminals - just run `pnpm dev` there!

### Current Setup

Our backend uses **pino** logger:
- Pretty-printed in dev (colored, readable)
- JSON in production (machine-readable)
- Configured in `apps/backend/lib/logger.ts`

### Log Levels

```typescript
logger.debug() // Development details
logger.info()  // Important events
logger.warn()  // Warning, not critical
logger.error() // Errors that need attention
```

---

## Summary

**For Development:**
1. Open terminal in your IDE
2. Run `pnpm -F @prophet/backend dev`
3. Logs appear in that terminal
4. No files needed!

**For Testing:**
1. Run `pnpm test:agent`
2. Check the terminal where backend is running
3. Or add `| tail -f /tmp/backend.log` if running in background
