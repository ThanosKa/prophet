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

## Why Client-Side Tool Execution?

Prophet executes tools **client-side** (in the Chrome extension) instead of **server-side** (on the backend). This is a critical architectural decision based on what APIs the tools need.

### The Requirement: Chrome DevTools Protocol (CDP)

Browser automation tools require CDP access to:
- **Control the browser**: Click, type, scroll, navigate
- **Read page state**: Capture accessibility tree, get element properties
- **Manage tabs**: Open, close, switch between tabs

**CDP is only accessible in Chrome extensions** - not on a backend server.

```typescript
// This API only exists in Chrome extensions:
chrome.debugger.sendCommand(
  { tabId },
  'Input.dispatchMouseEvent',
  { type: 'mousePressed', x: 100, y: 200, button: 'left' }
)

// ❌ Cannot run on Node.js backend
// ✅ Can only run in Chrome extension
```

### Client-Side vs Server-Side: When to Use Each

| Execution Location | When to Use | Required APIs | Example Projects |
|-------------------|-------------|---------------|------------------|
| **Client-Side** | Tools need browser/local environment access | `chrome.*` APIs, CDP, filesystem (Electron), GPU (local AI) | Browser automation, Chrome extensions, Electron apps, local AI tools |
| **Server-Side** | Tools are database/API/file operations on server | Database clients, external APIs, server filesystem | Coding agents (Claude Agent SDK), web scrapers, data analysis, CMS automation |

### Examples of Client-Side Tool Projects

**1. Browser Automation (Prophet)**
- **Need**: CDP access to control active browser tab
- **Why client-side**: `chrome.debugger` API only available in extensions
- **Tools**: click, type, snapshot, navigate

**2. Screen Recording Extension**
- **Need**: `chrome.tabCapture` for recording tab video/audio
- **Why client-side**: Cannot capture user's browser tabs from server
- **Tools**: start_recording, stop_recording, save_video

**3. Password Manager Extension**
- **Need**: Access to page DOM + secure local storage
- **Why client-side**: Sensitive data must stay local, autofill needs DOM access
- **Tools**: detect_login_form, fill_credentials, save_password

**4. Local AI Assistant (Electron)**
- **Need**: GPU access for local LLM inference
- **Why client-side**: User's GPU on their machine
- **Tools**: run_model_inference, load_model, manage_memory

**5. Clipboard Manager Extension**
- **Need**: `chrome.clipboard` API + local storage
- **Why client-side**: Clipboard is local to user's machine
- **Tools**: save_to_clipboard_history, search_history, paste_item

### Examples of Server-Side Tool Projects

**1. Coding Agent (Claude Agent SDK)**
- **Need**: Read/write files, run shell commands
- **Why server-side**: File operations on server filesystem
- **Tools**: Read, Write, Edit, Bash

**2. Database Admin AI**
- **Need**: Execute SQL queries, manage schemas
- **Why server-side**: Database connections on server
- **Tools**: execute_query, create_table, backup_database

**3. Web Scraper API**
- **Need**: Fetch pages, parse HTML, store data
- **Why server-side**: Doesn't need user's browser, runs in background
- **Tools**: fetch_url, parse_html, extract_data

### Prophet's Architecture Choice

Prophet **must use client-side execution** because:

1. **CDP Requirement**: Tools like `click_element_by_uid` need `chrome.debugger.sendCommand()`
2. **User's Browser Session**: Automation happens in the user's logged-in browser (not a separate Playwright instance)
3. **Security**: Backend never has access to what the user is browsing

This is why Prophet implements a **custom agent loop** instead of using Claude Agent SDK (which assumes server-side tool execution).

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
