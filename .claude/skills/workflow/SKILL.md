---
name: workflow
description: Durable multi-step orchestration for complex async processes. Use when coordinating long-running workflows, handling state between steps, or managing human-in-the-loop approvals.
---

# Upstash Workflow: Multi-Step Orchestration

**Documentation Sources**: Upstash Workflow official documentation + 2025 industry best practices for serverless orchestration.

**Note**: For simple background jobs and message queues, see the QStash skill (`.claude/skills/qstash/SKILL.md`). Workflow is optimized for complex multi-step processes with state management.

## Workflow vs QStash: When to Use Each

Choose the right tool based on complexity and state requirements:

| Aspect | Workflow | QStash |
|--------|----------|--------|
| **Purpose** | Multi-step orchestration | Background jobs, message queues |
| **State Model** | Persists step outputs automatically | Message-based (stateless) |
| **Use Case** | Complex business logic (5+ steps) | Fire-and-forget tasks (1 step) |
| **Examples** | User onboarding (email → trial → engage) | Send email, process image |
| **Step Coordination** | Built-in (context.run, sleep, waitForEvent) | Manual (multiple QStash messages) |
| **Retry Behavior** | Failed steps retry independently | Entire message retries |
| **Best For** | Long-running, dependent steps | Simple async tasks, scheduling |

**Decision Matrix**:
- **Use QStash** if: Single async task, no state needed, simple retry
- **Use Workflow** if: Multiple dependent steps, state between steps, conditional logic, long-running (>15 min), human approval needed

See `.claude/skills/workflow/SKILL.md` for comprehensive patterns including:
- Customer onboarding sequences
- Order fulfillment workflows
- Payment retry strategies
- Event-driven coordination with waitForEvent
- Parallel execution patterns
