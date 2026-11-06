# Mock Agent Mode - UI/UX Testing Guide

This guide explains how to use the mock agent system for testing UI/UX without hitting the real API.

## Quick Start

### 1. Enable Mock Mode

Update your `.env.local` file:

```bash
# For mock responses (no API calls, instant UI/UX testing)
VITE_USE_DEV_API=mock

# For dev API (real API, no credit deduction)
VITE_USE_DEV_API=true

# For production API (real API, with credit deduction)
# Remove VITE_USE_DEV_API or set to anything else
```

### 2. Available Modes

| Mode | Value | Behavior |
|------|-------|----------|
| **Mock** | `VITE_USE_DEV_API=mock` | Simulated responses, no API calls, instant agent UI |
| **Dev API** | `VITE_USE_DEV_API=true` | Real Anthropic calls via `/api/agent/chat/dev`, no Credits deducted; the route answers 403 outside `NODE_ENV=development` |
| **Production** | Not set or any other value | Real API via `/api/agent/chat`, credits deducted |

`pnpm test:agent` (`scripts/test-agent.sh`) curls the same `/api/agent/chat/dev` endpoint, so it needs `pnpm dev:web` running.

## How Mock Mode Works

When `VITE_USE_DEV_API=mock`, the agent uses the `mockAgentStream()` generator instead of hitting the real API:

### Features

✅ **Instant Response**: Streams text at 10-40ms per character
✅ **Tool Calls**: Simulates tool calls with realistic delays
✅ **Metrics**: Generates fake token counts and costs
✅ **Agent Overlay**: Triggers all the same UI/UX as real agent (borders, overlays, etc.)
✅ **Abort Support**: Can be cancelled mid-stream
✅ **No API Cost**: Zero API calls, zero cost

### Mock Responses

A normal message gets a random entry from `MOCK_RESPONSES` in `apps/sidepanel/src/lib/agent/mock-agent.ts`. These messages pick the tools instead: `/all`, `/snap`, `/nav`, `/tabs`, `/element`, `/wait`, `/page` and `/think` (forces thinking).

## Testing UI/UX

### Test Agent Overlay

1. Set `VITE_USE_DEV_API=mock`
2. Open sidepanel
3. Send any message
4. Watch the agent UI appear:
   - Streaming text
   - Tool call indicators
   - Border overlays on active tab
   - Metrics updates

### Test Different Scenarios

Send several messages to see different mock responses:
- Some with tool calls
- Some without
- Different text lengths
- Different timing

### Test Abort

1. Send a message
2. Click abort while streaming
3. Verify clean cancellation

## Customizing Mock Responses

Edit `apps/sidepanel/src/lib/agent/mock-agent.ts`:

```typescript
const MOCK_RESPONSES = [
  {
    text: "Your custom response here",
    tools: ['tool_name_1', 'tool_name_2'],
  },
  // Add more...
]
```

Tool names are only labels here: any name works for UI testing, even one the real agent lacks.

## Comparison Table

| Feature | Mock Mode | Dev API | Production |
|---------|-----------|---------|------------|
| API Calls | ❌ None | ✅ Real | ✅ Real |
| Credits Deducted | ❌ No | ❌ No | ✅ Yes |
| Response Speed | ⚡ Instant (fake stream) | 🐢 Real LLM | 🐢 Real LLM |
| Tool Execution | 🎭 Simulated | ✅ Real | ✅ Real |
| UI/UX Testing | ✅ Perfect | ⚠️ Slow | ⚠️ Slow + Costly |
| Cost per Test | $0.00 | Anthropic usage | Anthropic usage + Credits |

## Recommended Workflow

1. **UI/UX Development**: Use `mock` mode
   - Fast iteration
   - No API costs
   - Test all UI states

2. **Feature Testing**: Use `dev` API mode
   - Real API responses
   - No credit deduction
   - Test actual behavior

3. **Production**: Remove/change env var
   - Real usage
   - Credits deducted
   - End-to-end validation

## Tips

- Mock mode is **only** for UI/UX testing
- Always test with real API before production
- Mock responses are random per message
- Abort functionality works in all modes
- Mock mode simulates realistic typing speed for better visual testing
