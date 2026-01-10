---
name: open-source
description: Guide for preparing a project for open source release with README templates, GitHub workflows, community files, and best practices. Use when the user asks to 'open source the project', 'prepare for public release', 'add community files', 'create README with badges', or 'setup GitHub workflows'.
---

# Open Source Project Setup

Prepare a project for open source release with professional README, GitHub workflows, and community files.

## Checklist Before Open Sourcing

```
[ ] README.md with badges, features, installation
[ ] LICENSE file (use GitHub's picker for Apache 2.0)
[ ] CONTRIBUTING.md with PR workflow
[ ] CODE_OF_CONDUCT.md (use GitHub's template)
[ ] SECURITY.md for vulnerability reporting
[ ] .github/ISSUE_TEMPLATE/ for bug reports and features
[ ] .github/PULL_REQUEST_TEMPLATE.md
[ ] .github/workflows/ci.yml for automated checks
[ ] .env.example with all required variables documented
[ ] Remove all secrets, API keys, credentials from git history
[ ] Update package.json with repository URL
[ ] Enable GitHub Issues, Discussions, Sponsors
```

---

## README Structure

### Template with Shields.io Badges

```markdown
<div align="center">
  <h1>Project Name</h1>
  <p>One-line description of what the project does</p>

  <!-- Badges -->
  [![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://typescriptlang.org)
  [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)

  <!-- Social -->
  [![Twitter Follow](https://img.shields.io/twitter/follow/username?style=social)](https://twitter.com/username)
  [![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/username)
</div>

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Features
- ✨ Feature 1
- 🚀 Feature 2
- 🔒 Feature 3

## Tech Stack
| Technology | Purpose |
|------------|---------|
| [Next.js](https://nextjs.org) | Framework |
| [TypeScript](https://typescriptlang.org) | Language |
| [Tailwind](https://tailwindcss.com) | Styling |

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm 8+

### Installation
\`\`\`bash
git clone https://github.com/username/project.git
cd project
pnpm install
cp .env.example .env.local
pnpm dev
\`\`\`

## Usage
Document main use cases here.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License
Licensed under the Apache 2.0 License - see [LICENSE](LICENSE).

## Support
- [Buy Me A Coffee](https://buymeacoffee.com/username)
- [GitHub Sponsors](https://github.com/sponsors/username)

---

<div align="center">
  Made with care by developers, for developers.

  <a href="https://github.com/username/project/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=username/project" />
  </a>
</div>
```

### Badge Examples (shields.io)

**Stack:**
```markdown
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
```

**Status:**
```markdown
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/username/repo/ci.yml?style=for-the-badge)](https://github.com/username/repo/actions)
[![Stars](https://img.shields.io/github/stars/username/repo?style=for-the-badge)](https://github.com/username/repo/stargazers)
```

**Social:**
```markdown
[![Twitter](https://img.shields.io/twitter/follow/username?style=for-the-badge&logo=x)](https://x.com/username)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/username)
```

---

## GitHub Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Type-check and lint only (skip builds - Vercel handles that).

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint
```

**Add to package.json if missing:**
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint ."
  }
}
```

---

## Community Files

### LICENSE
Use GitHub's license picker:
1. Create new file → `LICENSE`
2. Click "Choose a license template"
3. Select "Apache License 2.0"
4. Fill in year and copyright holder
5. Commit

### CONTRIBUTING.md
Keep it brief:

```markdown
# Contributing

## Pull Requests
1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make changes and test: `pnpm test` + `pnpm lint`
4. Commit: `feat: add new feature`
5. Push and open PR

## Commit Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code restructuring

## Questions?
Open a [Discussion](https://github.com/username/project/discussions).
```

### CODE_OF_CONDUCT.md
Use GitHub's template:
1. Create new file → `CODE_OF_CONDUCT.md`
2. Click "Choose a code of conduct template"
3. Select "Contributor Covenant"
4. Commit

### SECURITY.md
Brief guidance only:

```markdown
# Security Policy

## Reporting a Vulnerability
**Do not report security issues publicly.**

Email: security@yourdomain.com

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You will receive a response within 48 hours.
```

### Issue Templates

**`.github/ISSUE_TEMPLATE/bug_report.md`:**
```markdown
---
name: Bug Report
about: Report a bug
title: '[BUG] '
labels: bug
---

## Description
Clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected vs Actual
- Expected: ...
- Actual: ...

## Environment
- OS: [e.g., macOS]
- Browser: [e.g., Chrome]
- Version: [e.g., 1.0.0]
```

**`.github/ISSUE_TEMPLATE/feature_request.md`:**
```markdown
---
name: Feature Request
about: Suggest a feature
title: '[FEATURE] '
labels: enhancement
---

## Problem
Describe the problem you're solving.

## Proposed Solution
Your proposed solution.

## Alternatives
Other solutions you've considered.
```

**`.github/PULL_REQUEST_TEMPLATE.md`:**
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Checklist
- [ ] Code follows project style
- [ ] Self-reviewed
- [ ] Tests added (if applicable)
- [ ] Docs updated (if needed)
```

---

## Final Steps

### Update package.json
```json
{
  "name": "project-name",
  "version": "1.0.0",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/project.git"
  },
  "bugs": "https://github.com/username/project/issues",
  "homepage": "https://github.com/username/project#readme"
}
```

### Remove Secrets from Git History
```bash
# Check for exposed secrets
git log -p | grep -i "api_key\|secret\|password\|token"

# If found, use BFG Repo-Cleaner or git filter-branch
```

### Enable GitHub Features
1. Settings → Features:
   - ✅ Issues
   - ✅ Discussions
   - ✅ Sponsor button
2. Settings → Security → Enable vulnerability alerts

### Add Repository Topics
Add discoverable topics:
- `nextjs`
- `typescript`
- `react`
- `tailwindcss`
- `open-source`

---

## ✅ Launch Checklist

```
[ ] All secrets removed from git history
[ ] .env.example up to date
[ ] README complete with badges
[ ] LICENSE added (Apache 2.0)
[ ] CONTRIBUTING.md added
[ ] CODE_OF_CONDUCT.md added
[ ] SECURITY.md added
[ ] Issue/PR templates added
[ ] GitHub Actions CI passing
[ ] Repository is public
[ ] Topics added for discoverability
[ ] Sponsor links configured (optional)
```
