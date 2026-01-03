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
| **Dev API** | `VITE_USE_DEV_API=true` | Real API via `/api/agent/chat/dev`, no credits deducted |
| **Production** | Not set or any other value | Real API via `/api/agent/chat`, credits deducted |

## How Mock Mode Works

When `VITE_USE_DEV_API=mock`, the agent uses the `mockAgentStream()` generator instead of hitting the real API:

### Features

✅ **Instant Response**: Streams text at 20-60ms per character (realistic typing speed)
✅ **Tool Calls**: Randomly simulates 0-2 tool calls with realistic delays
✅ **Metrics**: Generates fake token counts and costs
✅ **Agent Overlay**: Triggers all the same UI/UX as real agent (borders, overlays, etc.)
✅ **Abort Support**: Can be cancelled mid-stream
✅ **No API Cost**: Zero API calls, zero cost

### Mock Responses

The system randomly picks from 5 pre-defined responses:

1. "I'll help you with that. Let me search for the information you need."
   - Tools: `search_google`

2. "I can see the page. Let me extract the data you're looking for."
   - Tools: `get_page_content`, `extract_data`

3. "I'll navigate to that page and click the button for you."
   - Tools: `navigate_to`, `click_element`

4. "Let me analyze the current page and extract the relevant information."
   - Tools: `get_page_content`

5. "Here's what I found based on your request."
   - Tools: None (text-only response)

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

Send messages and refresh to see different mock responses:
- Some with tool calls
- Some without
- Different text lengths
- Different timing

### Test Abort

1. Send a message
2. Click abort while streaming
3. Verify clean cancellation

## Customizing Mock Responses

Edit `/apps/sidepanel/src/lib/agent/mock-agent.ts`:

```typescript
const MOCK_RESPONSES = [
  {
    text: "Your custom response here",
    tools: ['tool_name_1', 'tool_name_2'],
  },
  // Add more...
]
```

### Available Mock Tools

- `search_google`
- `get_page_content`
- `click_element`
- `extract_data`
- `navigate_to`

You can also add custom tool names - they'll work for UI testing even if they don't exist in the real agent.

## Environment Variable Cleanup

We also simplified the environment variables:

### Before
```bash
VITE_API_URL=http://localhost:3000
VITE_SYNC_HOST=http://localhost:3000  # ❌ Redundant
```

### After
```bash
VITE_API_URL=http://localhost:3000
# syncHost automatically uses apiUrl
```

The `VITE_SYNC_HOST` was redundant since Clerk's sync host is the same as your API URL (the marketing site).

## Files Modified

- **`apps/sidepanel/.env.example`** - Updated env var documentation
- **`apps/sidepanel/src/lib/config.ts`** - Added `useMockApi` flag, removed `syncHost`
- **`apps/sidepanel/src/main.tsx`** - Uses `apiUrl` for Clerk sync
- **`apps/sidepanel/src/components/ui/user-avatar.tsx`** - Uses `apiUrl` instead of `syncHost`
- **`apps/sidepanel/src/hooks/useAgentChat.ts`** - Added mock mode support
- **`apps/sidepanel/src/lib/agent/mock-agent.ts`** - New mock agent generator

## Comparison Table

| Feature | Mock Mode | Dev API | Production |
|---------|-----------|---------|------------|
| API Calls | ❌ None | ✅ Real | ✅ Real |
| Credits Deducted | ❌ No | ❌ No | ✅ Yes |
| Response Speed | ⚡ Instant (fake stream) | 🐢 Real LLM | 🐢 Real LLM |
| Tool Execution | 🎭 Simulated | ✅ Real | ✅ Real |
| UI/UX Testing | ✅ Perfect | ⚠️ Slow | ⚠️ Slow + Costly |
| Cost per Test | $0.00 | $0.00 | ~$0.01-0.05 |

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
- Mock responses are random - refresh to see different ones
- Abort functionality works in all modes
- Mock mode simulates realistic typing speed for better visual testing
