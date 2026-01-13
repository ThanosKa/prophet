# Prophet Architecture

Technical documentation for developers on how Prophet's browser automation works.

## Overview

Prophet is a Chrome extension that enables AI-powered browser automation. Unlike screenshot-based approaches (like Computer Use or Claude in Chrome), Prophet uses the **accessibility tree** for fast, deterministic interactions.

**Key Technologies:**
- [Anthropic API](https://docs.anthropic.com/en/api/overview) with [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)
- Chrome DevTools Protocol (CDP) for browser control
- Custom agent loop for multi-turn interactions

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Sidepanel)                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  agent-loop.ts                                              ││
│  │  • Manages multi-turn loop (max 10 turns)                   ││
│  │  • Streams responses from backend API                       ││
│  │  • Executes tools locally via CDP                           ││
│  │  • Collects tool results for next turn                      ││
│  └───────────────────────┬─────────────────────────────────────┘│
│                          │                                      │
│  ┌───────────────────────▼─────────────────────────────────────┐│
│  │  background-bridge.ts                                       ││
│  │  • Communicates with Chrome background script               ││
│  │  • Executes CDP commands (click, type, navigate)            ││
│  │  • Captures accessibility tree snapshots                    ││
│  └─────────────────────────────────────────────────────────────┘│
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTPS + SSE (Server-Sent Events)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Backend API (Next.js - apps/marketing)                         │
│                                                                 │
│  app/api/agent/chat/route.ts                                    │
│  • Authenticates requests (Clerk)                               │
│  • Rate limits by user tier (Upstash Redis)                     │
│  • Verifies credit balance                                      │
│  • Proxies to Anthropic API                                     │
│  • Streams response via SSE                                     │
│  • Tracks token usage and billing                               │
│  • Does NOT execute tools (security boundary)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTPS (Streaming)
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│  Anthropic API                                                  │
│                                                                 │
│  anthropic.messages.stream({                                    │
│    model: "claude-sonnet-4-20250514",                           │
│    tools: AGENT_TOOLS,        // 19 browser automation tools    │
│    messages: [...],           // Conversation history           │
│    system: AGENT_SYSTEM_PROMPT                                  │
│  })                                                             │
│                                                                 │
│  Returns: text + tool_use content blocks                        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Sends Message

```
User: "Click the login button"
     │
     ▼
┌─────────────────────────────────────────┐
│ Sidepanel sends to Backend API:         │
│ {                                       │
│   chatId: "...",                        │
│   userMessage: "Click the login button",│
│   model: "claude-sonnet-4-20250514"     │
│ }                                       │
└─────────────────────────────────────────┘
```

### 2. Backend Streams Claude Response

```
Backend → Anthropic API → Backend → Sidepanel

SSE Events:
  data: {"type": "content_delta", "delta": "I'll click..."}
  data: {"type": "tool_use", "toolUse": {"name": "take_snapshot", ...}}
  data: {"type": "tool_use", "toolUse": {"name": "click_element_by_uid", ...}}
  data: {"type": "done", ...}
```

### 3. Tool Execution (Client-Side)

```
┌─────────────────────────────────────────┐
│ Sidepanel receives tool_use event       │
│                          │              │
│                          ▼              │
│ executeToolViaBackground(               │
│   "click_element_by_uid",               │
│   { uid: "Ab12Cd3E" }                   │
│ )                                       │
│                          │              │
│                          ▼              │
│ Background script executes via CDP      │
│                          │              │
│                          ▼              │
│ Returns result to agent-loop            │
└─────────────────────────────────────────┘
```

### 4. Multi-Turn Loop

If Claude requested tools, the loop continues:

```
┌─────────────────────────────────────────┐
│ agent-loop.ts sends continuation:       │
│ {                                       │
│   chatId: "...",                        │
│   previousContent: [                    │
│     { type: "text", text: "I'll..." },  │
│     { type: "tool_use", id: "...", ... }│
│   ],                                    │
│   toolResults: [                        │
│     { tool_use_id: "...", content: ...} │
│   ]                                     │
│ }                                       │
└─────────────────────────────────────────┘
```

This continues until Claude responds without tool calls or hits max turns (10).

## Why Accessibility Tree?

Prophet uses the browser's accessibility tree instead of screenshots:

| Approach | Speed | Tokens | Accuracy | Vision Model |
|----------|-------|--------|----------|--------------|
| **Accessibility Tree** (Prophet) | Fast | Low | Deterministic | Not needed |
| Screenshots (Computer Use) | Slow | High | Probabilistic | Required |

### How It Works

1. **Snapshot**: Captures the accessibility tree of the current page
2. **UIDs**: Each element gets an 8-character unique identifier
3. **Targeting**: Agent uses UIDs to interact with specific elements

```
// Example snapshot output
uid=Ab12Cd3E button "Login" <button>
uid=Xy98Zw7V textbox "Email" value="" <input>
uid=Mn45Op6Q link "Forgot password?" <a>
```

This approach is the same used by [Playwright MCP](https://github.com/microsoft/playwright-mcp):
> "Rather than relying on screenshots, it generates structured accessibility snapshots of web pages... making interactions more deterministic and efficient."

## Why Custom Agent Loop?

Prophet implements its own agent loop instead of using [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk):

| Feature | Prophet | Claude Agent SDK |
|---------|---------|------------------|
| Runtime | Chrome Extension | Claude Code CLI |
| Tool Execution | In browser (CDP) | Filesystem/Bash |
| Browser Context | User's logged-in session | Separate Playwright browser |
| Dependencies | None | Claude Code CLI required |
| Use Case | Browser automation | Code/file operations |

**Key Benefits:**
- **Browser Context**: Tools execute in the user's actual browser session (logged-in state preserved)
- **Security Boundary**: Tool execution is isolated from the backend (API keys never exposed)
- **No Dependencies**: Users don't need to install Claude Code CLI
- **Full Control**: Custom tool definitions optimized for browser automation

## Component Structure

```
apps/
├── sidepanel/                    # Chrome Extension
│   └── src/
│       └── lib/
│           └── agent/
│               ├── agent-loop.ts       # Multi-turn orchestration
│               ├── background-bridge.ts # CDP communication
│               ├── snapshot-manager.ts  # Accessibility tree
│               └── tools/              # Tool executors
│
├── marketing/                    # Next.js (Landing + API)
│   ├── app/
│   │   └── api/
│   │       └── agent/
│   │           └── chat/
│   │               └── route.ts  # Streaming API endpoint
│   └── lib/
│       └── agent/
│           ├── tools.ts          # Tool definitions
│           └── system-prompt.ts  # Agent instructions
│
└── shared/                       # Shared Types
    ├── types/agent.ts            # TypeScript types
    └── schemas/agent.ts          # Zod validation
```

## Available Tools (19)

| Category | Tools |
|----------|-------|
| **Observation** | `take_snapshot`, `search_snapshot`, `get_page_content`, `get_page_info` |
| **Interaction** | `click_element_by_uid`, `fill_element_by_uid`, `hover_element_by_uid` |
| **Navigation** | `navigate`, `scroll_page`, `go_back`, `go_forward`, `reload_page` |
| **Wait** | `wait_for_selector`, `wait_for_navigation`, `wait_for_timeout` |
| **Tabs** | `list_tabs`, `switch_tab`, `close_tab`, `open_new_tab` |

## Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│                     SECURITY BOUNDARIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Chrome Extension                 Backend API                   │
│  ─────────────────                ──────────────                │
│  • Executes tools                 • Has ANTHROPIC_API_KEY       │
│  • Has browser access             • Never executes tools        │
│  • No API keys                    • No browser access           │
│                                                                 │
│  Why: If backend executed tools, a compromised backend could    │
│  access user's browser sessions. By separating concerns:        │
│  - Backend can't see what's in the browser                      │
│  - Extension can't leak API keys                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Comparison with Other Approaches

### vs Claude Agent SDK

The [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk) is designed for **code/file operations**:

```typescript
// Claude Agent SDK - for coding agents
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] }
})) { ... }
```

Prophet is designed for **browser automation**:

```typescript
// Prophet - for browser agents
for await (const event of runAgentLoop(baseUrl, chatId, "Click login")) {
  if (event.type === "tool_use") {
    await executeToolViaBackground(event.toolUse.name, event.toolUse.input);
  }
}
```

### vs Computer Use

[Computer Use](https://docs.anthropic.com/en/docs/agents-and-tools/computer-use) takes screenshots and uses vision:

- **Slower**: Screenshot → analyze → coordinate click
- **More tokens**: Images are expensive
- **Probabilistic**: Vision can misidentify elements

Prophet uses accessibility tree:

- **Faster**: Direct element targeting via UIDs
- **Fewer tokens**: Structured text, not images
- **Deterministic**: Exact element identification

### vs Playwright MCP

[Playwright MCP](https://github.com/microsoft/playwright-mcp) uses the same approach (accessibility tree) but:

| Feature | Prophet | Playwright MCP |
|---------|---------|----------------|
| Browser | User's Chrome (logged-in) | Separate Playwright instance |
| Integration | Chrome Extension | MCP server process |
| Auth | Uses existing sessions | Needs separate auth |

## References

- [Anthropic API - Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use/overview)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp)
- [Claude Agent SDK](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)
