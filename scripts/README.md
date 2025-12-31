# Development & Testing Scripts

This directory contains scripts for testing the Prophet Agent and monitoring system behavior.

## Test Agent Endpoint

The `dev` endpoint bypasses credit checks and rate limits for easier local development.

### Usage (Cross-Platform)

#### Windows (PowerShell)
```powershell
./scripts/test-agent.ps1
```

#### macOS / Linux (Bash)
```bash
./scripts/test-agent.sh
```

### What it tests

1.  **Basic Chat**: Verifies the LLM responds to simple text messages.
2.  **Strict Tool Validation**: Ensures that tool calls sent in `previousContent` match their defined schemas (e.g., `navigate` must have a valid `url`).
3.  **Error Handling**: Verifies that invalid models or malformed requests return proper 400/500 errors.

---

## Logs & Monitoring

### LLM Interaction Logs
All raw requests and responses to Anthropic are captured in:
`apps/marketing/logs/response.txt`

This file is automatically created and appended to when running in `NODE_ENV=development`.

### Server Logs
To see real-time database queries and application logic:
```bash
pnpm -F @prophet/backend dev
```

### Drizzle Studio (Database GUI)
To inspect the database state (chats, messages, users):
```bash
pnpm -F @prophet/backend db:studio
```

---

## Tip: Running individual tests
You can use `curl` directly for quick checks:

```powershell
curl.exe -X POST http://localhost:3000/api/agent/chat/dev `
  -H "Content-Type: application/json" `
  -d '{\"chatId\": \"[UUID]\", \"userMessage\": \"Hi\"}'
```
