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

### Comprehensive Professional Template

```markdown
<div align="center">

<h1>✨ Project Name ✨</h1>

[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind v4](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Radix-8A3FFC?style=for-the-badge)](https://ui.shadcn.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/username/repo?style=for-the-badge&logo=github)](https://github.com/username/repo/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)

<p>One-line description of what the project does and why it's useful.</p>

[Report Bug](https://github.com/username/repo/issues/new?template=bug_report.md) · [Request Feature](https://github.com/username/repo/issues/new?template=feature_request.md) · [Discussions](https://github.com/username/repo/discussions)

</div>

---

## Table of Contents

- [About](#about)
- [Features](#features)
- [Demo](#demo)
- [How It Works](#how-it-works)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Database Setup](#database-setup)
  - [Run Locally](#run-locally)
  - [Testing](#testing)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Deployment](#deployment)
  - [Deploy to Vercel](#deploy-to-vercel)
  - [Production Checklist](#production-checklist)
- [CI/CD](#cicd)
- [Contributing](#contributing)
- [Security](#security)
- [Acknowledgments](#acknowledgments)
- [Star History](#star-history)
- [Contact](#contact)
- [Support & Sponsor](#support--sponsor)
- [License](#license)
- [Contributions](#contributions)

---

## About

Detailed explanation of what the project is, who it's for, and why it exists. 2-3 paragraphs max.

Perfect for developers/users who want to:
- Bullet point 1
- Bullet point 2
- Bullet point 3

## Features

Group features by category:

### Category 1
- **Feature Name**: Description
- **Feature Name**: Description

### Category 2
- **Feature Name**: Description
- **Feature Name**: Description

## Demo

- Quick start instructions
- Link to live demo (if available)
- Quick preview walkthrough

## How It Works

Step-by-step explanation of the key user/developer flow:

1. Step 1 with details
2. Step 2 with details
3. Step 3 with details
...

## Built With

| Category         | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | Next.js 16 (App Router)                  |
| Language         | TypeScript (strict mode)                 |
| Styling          | Tailwind CSS v4 + shadcn/ui              |
| State Management | Zustand                                  |
| Auth             | Clerk                                    |
| Database         | Supabase (PostgreSQL)                    |
| ORM              | Drizzle ORM                              |
| Payments         | Stripe                                   |
| Validation       | Zod                                      |
| Hosting          | Vercel                                   |

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Accounts: List required services

### Installation

\`\`\`bash
git clone https://github.com/username/repo.git
cd repo
pnpm install
\`\`\`

### Environment Setup

\`\`\`bash
cp .env.example .env.local
# Fill in required variables
\`\`\`

Link to detailed setup documentation if available.

### Database Setup

\`\`\`bash
pnpm db:migrate
\`\`\`

### Run Locally

\`\`\`bash
pnpm dev
# Visit http://localhost:3000
\`\`\`

### Testing

\`\`\`bash
pnpm lint              # ESLint
pnpm type-check        # TypeScript
pnpm test              # Run tests
pnpm test:coverage     # With coverage
\`\`\`

## Project Structure

\`\`\`
project/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   └── ...                # Pages
├── components/            # React components
├── lib/                   # Utilities
├── .claude/               # Documentation
└── .github/               # GitHub config
\`\`\`

## Architecture

Explain key architectural decisions:

**Data Flow:**
Describe data flow

**Authentication:**
Describe auth approach

**Key Patterns:**
- Pattern 1
- Pattern 2

## Deployment

### Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Production Checklist

- [ ] Configure production env vars
- [ ] Set up database
- [ ] Configure webhooks
- [ ] Test payment flows
- [ ] Enable monitoring

## CI/CD

Describe what CI/CD checks run:
- Linting
- Type checking
- Tests
- Build validation

## Contributing

Contributions welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

Key areas for contribution:
- Area 1
- Area 2
- Area 3

## Security

Report vulnerabilities as described in [SECURITY.md](SECURITY.md).

Key security features:
- Feature 1
- Feature 2

## Acknowledgments

- [Service/Tool](https://example.com) for what it provides
- [Another Tool](https://example.com) for what it provides

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=username/repo&type=Date)](https://star-history.com/#username/repo&Date)

## Contact

- GitHub Issues: [Open an issue](https://github.com/username/repo/issues)
- GitHub Discussions: [Start a discussion](https://github.com/username/repo/discussions)
- Creator: [@username](https://github.com/username)

## Support & Sponsor

**Documentation & Help:**
- Documentation links
- Setup guides

**Support the Project:**
- ⭐ Star the repo
- ☕ [Buy Me a Coffee](https://buymeacoffee.com/username)
- 💖 [GitHub Sponsors](https://github.com/sponsors/username)

## License

Licensed under the Apache 2.0 License - see [LICENSE](LICENSE).

## Contributions

Contributions are welcome! Please feel free to submit a Pull Request.

### Contributors

<a href="https://github.com/username/repo/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=username/repo" alt="Contributors"/>
</a>
\`\`\`

### Badge Examples (shields.io)

**Common Tech Stack Badges:**

```markdown
<!-- Frameworks -->
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

<!-- Languages -->
[![TypeScript 5](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

<!-- Styling -->
[![Tailwind v4](https://img.shields.io/badge/Tailwind_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-Radix-8A3FFC?style=for-the-badge)](https://ui.shadcn.com/)

<!-- Databases -->
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)

<!-- Auth -->
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white)](https://clerk.com/)
[![Auth.js](https://img.shields.io/badge/Auth.js-000000?style=for-the-badge&logo=auth0&logoColor=white)](https://authjs.dev/)

<!-- AI -->
[![Anthropic](https://img.shields.io/badge/Anthropic_Claude-000000?style=for-the-badge&logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://gemini.google.com/)

<!-- Payments -->
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)

<!-- Serverless -->
[![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

<!-- Tools -->
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)

<!-- Status -->
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/username/repo?style=for-the-badge&logo=github)](https://github.com/username/repo/stargazers)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)](CONTRIBUTING.md)
[![CI](https://img.shields.io/github/actions/workflow/status/username/repo/ci.yml?style=for-the-badge)](https://github.com/username/repo/actions)
```

**Badge customization:**
- Use `style=for-the-badge` for large, bold badges
- Find more logos at [Simple Icons](https://simpleicons.org/)
- Customize colors with hex codes (remove #)

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
