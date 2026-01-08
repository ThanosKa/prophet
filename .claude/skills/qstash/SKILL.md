---
name: qstash
description: Serverless messaging and scheduling for background jobs, cron tasks, and reliable async workflows. Use when implementing background processing, scheduled tasks, message queues, or webhooks with automatic retries.
---

# QStash: Background Jobs & Message Queues

**Documentation Sources**: Upstash QStash official documentation + 2025 industry best practices for serverless messaging.

**Note**: For complex multi-step workflows with state management, see the Workflow skill (`.claude/skills/workflow/SKILL.md`). QStash is optimized for simple background jobs and message queues.

## When to Use QStash vs Workflow

Choose the right tool for your use case:

| Feature | QStash | Workflow |
|---------|--------|----------|
| **Purpose** | Background jobs, message queues | Multi-step orchestration |
| **Use Case** | Fire-and-forget tasks | Complex business logic |
| **State** | Message-based (stateless) | Persists step outputs |
| **Examples** | Send email, process image | User onboarding flow (5 steps) |
| **Complexity** | Simple, single-step | Multiple dependent steps |
| **Best For** | Async tasks, scheduling | Coordinating long workflows |

**Rule of Thumb**: Use QStash for single async tasks. Use Workflow when you need to coordinate multiple steps with state.

See `.claude/skills/qstash/SKILL.md` for comprehensive QStash patterns and `.claude/skills/workflow/SKILL.md` for multi-step orchestration.
