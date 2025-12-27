# Cursor Rules

This directory contains Cursor IDE integration files (`.mdc` format) that mirror the `.claude/skills/` directory.

## Why Two Systems?

- **`.claude/skills/`** - Source of truth, comprehensive guides for Claude Code agent
- **`.cursor/rules/`** - IDE integration, auto-surfaces in Cursor's rule panel for easy access

## File Mapping

| Cursor Rule | Claude Skill | Purpose |
|---|---|---|
| `backend/api-security.mdc` | `.claude/skills/backend/api-security/` | API security best practices |
| `backend/database-patterns.mdc` | `.claude/skills/backend/database-patterns/` | Drizzle ORM patterns |
| `backend/testing.mdc` | `.claude/skills/testing/` | Vitest patterns (backend) |
| `frontend/accessibility.mdc` | `.claude/skills/frontend/accessibility/` | WCAG compliance patterns |
| `frontend/component-design.mdc` | `.claude/skills/frontend/component-design/` | React component patterns |
| `frontend/seo-patterns.mdc` | `.claude/skills/frontend/seo-patterns/` | Lighthouse 100% SEO |
| `frontend/ux-patterns.mdc` | `.claude/skills/frontend/ux-patterns/` | Loading states, error handling |
| `frontend/visual-polish.mdc` | `.claude/skills/frontend/visual-polish/` | Animations, micro-interactions |
| `stack/chrome-extension.mdc` | `.claude/skills/stack/chrome-extension/` | CRXJS + Manifest V3 setup |
| `typescript-standards.mdc` | `.claude/skills/typescript-standards/` | Type safety patterns |
| `skill-creator.mdc` | `.claude/skills/skill-creator/` | Creating new skills |

## Sync Policy

When updating a skill in `.claude/skills/`:
1. Update the `.SKILL.md` file
2. Mirror changes to the corresponding `.mdc` file in `.cursor/rules/`

This keeps both systems in sync for agents and IDE users.

## File Format

All `.mdc` files follow Cursor's format:
```yaml
---
name: skill-name
description: When to use this rule.
---

# Title

Content in markdown...
```

