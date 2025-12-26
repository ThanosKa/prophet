---
name: skill-creator
description: Guide for creating Claude Code skills. Use when the user asks to 'create a skill', 'write a SKILL.md', 'build a skill', or mentions skill development.
---

# Creating Claude Code Skills

## Start Simple

A complete skill needs just `SKILL.md`:

```
skill-name/
└── SKILL.md
```

That's it. Everything else is optional and should only be added when SKILL.md exceeds ~500 lines.

## Write the Frontmatter

Every skill starts with YAML frontmatter:

```yaml
---
name: your-skill-name
description: What it does and when to use it. Use when user asks to '[verb] [thing]'.
---
```

**Rules:**
- `name`: lowercase, hyphens only, must be unique in `.claude/skills/`
- `description`: 1-2 sentences with trigger phrases users would actually say

## Write Clear Instructions

The body is written in imperative/infinitive form (as instructions). Use headers, examples, and be practical.

### ✅ GOOD Structure

```markdown
## Core Concept
Brief explanation of what to do.

## How to Apply
Step-by-step instructions or patterns.

### ✅ GOOD Pattern
Show best practice with example.

### ❌ BAD Pattern
Show what to avoid.

## Checklist
- [ ] Key step 1
- [ ] Key step 2
```

### ❌ BAD Structure

- Vague descriptions without trigger phrases
- Overly formal or technical language
- Second-person ("You should...") instead of imperative
- Unnecessary complexity or supporting files

## Real Example: This Skill

This skill itself demonstrates simplicity - just one SKILL.md file with essential information. No references/, no examples/, no scripts/. If you need deeper guidance while creating a skill, that belongs in a *separate* skill about skill architecture, not here.

## When to Expand

Only add `references/`, `examples/`, or `scripts/` directories when:
- SKILL.md genuinely exceeds 500 lines
- Multiple distinct topics need separation
- You have working code examples worth including

**Default:** Keep it to just SKILL.md.

## Trigger Phrases

Your description's trigger phrases determine discoverability. Be specific:

**✅ GOOD:**
- "create a skill"
- "write a SKILL.md"
- "build a custom skill"

**❌ BAD:**
- "skill guidance" (too vague)
- "You should use this skill when..." (second-person)

## Quick Checklist

- [ ] SKILL.md exists and is focused
- [ ] Frontmatter has `name` and `description`
- [ ] Description uses trigger phrases users would say
- [ ] Body is clear, actionable, and practical
- [ ] Includes ✅ GOOD and ❌ BAD examples
- [ ] No unnecessary supporting files
