# Contributing to Prophet

Thank you for your interest in contributing to Prophet! This guide will help you get started.

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/ThanosKa/prophet/issues)
2. If not, create a new issue using the bug report template
3. Include reproduction steps, expected behavior, and actual behavior
4. Add screenshots if applicable

### Suggesting Features

1. Check existing [Issues](https://github.com/ThanosKa/prophet/issues) and [Discussions](https://github.com/ThanosKa/prophet/discussions)
2. Open a new issue using the feature request template
3. Describe the use case and proposed solution
4. Explain alternatives you've considered

### Pull Requests

1. **Fork the repository**
2. **Create a new branch**: `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Run tests**: `pnpm test`
5. **Run linting**: `pnpm lint`
6. **Run type-check**: `pnpm type-check`
7. **Commit with a descriptive message** (see commit conventions below)
8. **Push to your fork**: `git push origin feature/your-feature`
9. **Open a Pull Request** with a clear description

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/prophet.git
cd prophet

# Install dependencies
pnpm install

# Copy environment variables (see setup docs)
cp apps/marketing/.env.example apps/marketing/.env.local
cp apps/sidepanel/.env.example apps/sidepanel/.env.local

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev:web         # Marketing + API (localhost:3000)
pnpm dev:sidepanel   # Chrome extension (localhost:5173)
```

See [.claude/docs/setup.md](.claude/docs/setup.md) for detailed setup instructions.

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature (e.g., `feat: add dark mode toggle`)
- `fix:` Bug fix (e.g., `fix: resolve authentication issue`)
- `docs:` Documentation changes (e.g., `docs: update README setup steps`)
- `style:` Code formatting, no logic change (e.g., `style: fix indentation`)
- `refactor:` Code restructuring, no behavior change (e.g., `refactor: extract utility function`)
- `test:` Adding or updating tests (e.g., `test: add unit tests for cache`)
- `chore:` Maintenance tasks (e.g., `chore: update dependencies`)

## Code Style

- **TypeScript**: All code must be TypeScript
- **Formatting**: Run `pnpm lint` before committing
- **Type Safety**: Run `pnpm type-check` before committing
- **Follow existing patterns**: Match the style of surrounding code
- **Write tests**: Add tests for new features when applicable

## Project Structure

- `apps/sidepanel/` - Chrome extension (Vite + React 18)
- `apps/marketing/` - Next.js marketing + backend API
- `apps/shared/` - Shared types and utilities
- `.claude/docs/` - Detailed documentation
- `.claude/skills/` - Coding standards and patterns

## Testing

```bash
pnpm test              # Run all tests in watch mode
pnpm test:run          # Run tests once
pnpm test:coverage     # Run tests with coverage
```

## Questions?

- Open a [Discussion](https://github.com/ThanosKa/prophet/discussions) for questions
- Check existing [documentation](.claude/docs/)
- Reach out on [GitHub Issues](https://github.com/ThanosKa/prophet/issues) for bugs

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
