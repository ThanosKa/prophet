# Testing Standards - Prophet Project

Use this skill when writing or reviewing tests for any part of the Prophet monorepo.

## Framework

- **Vitest** for all testing (backend API, frontend components, shared utilities)
- Colocated test files: `*.test.ts` or `*.test.tsx` next to source files
- Environment: Node for backend, jsdom for frontend

---

## Commands

### From Root (Recommended)
```bash
pnpm test              # Run all tests in watch mode
pnpm test:run          # Run all tests once
pnpm test:coverage     # Run all tests with coverage
```

### From Individual Apps
```bash
pnpm -F @prophet/marketing test        # Marketing/API tests
pnpm -F @prophet/sidepanel test        # Sidepanel tests (when added)
pnpm -F @prophet/shared test           # Shared utilities tests (when added)
```

---

## Test File Location

Tests are **colocated** next to their source files:

```
apps/marketing/
├── app/api/stripe/webhook/
│   ├── route.ts           # Source
│   └── route.test.ts      # Test
└── lib/
    ├── pricing.ts
    └── pricing.test.ts

apps/sidepanel/
└── src/components/
    ├── ChatMessage.tsx       # Source
    └── ChatMessage.test.tsx  # Test (future)

apps/shared/
└── utils/
    ├── validation.ts         # Source
    └── validation.test.ts    # Test (future)
```

---

## Backend/API Testing (Vitest + Node)

### Config: `apps/marketing/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',  // Node environment for API routes
    include: ['**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

### Mocking Patterns

#### Drizzle ORM
```typescript
const mockFindFirst = vi.fn()
const mockUpdate = vi.fn(() => ({
  set: vi.fn(() => ({ where: vi.fn() })),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: { users: { findFirst: mockFindFirst } },
    update: mockUpdate,
  },
}))
```

#### Stripe
```typescript
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { update: vi.fn() },
  },
}))
```

#### Clerk Auth
```typescript
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => ({ userId: 'test-user-id' })),
}))
```

#### Logger
```typescript
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))
```

#### Next.js Headers
```typescript
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn(() => 'mock-value'),
  })),
}))
```

---

## Frontend Testing (Vitest + React Testing Library)

### Config: `apps/sidepanel/vitest.config.ts` (future)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',  // jsdom for React components
    setupFiles: './src/test/setup.ts',
  },
})
```

### Setup File: `apps/sidepanel/src/test/setup.ts` (future)
```typescript
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
```

### React Component Testing (future)
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ChatMessage from './ChatMessage'

describe('ChatMessage', () => {
  it('renders user message', () => {
    render(<ChatMessage role="user" content="Hello" />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Mocking React Hooks (future)
```typescript
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-123', email: 'test@example.com' },
    isLoading: false,
  })),
}))
```

---

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('FeatureName', () => {
  beforeEach(() => {
    vi.clearAllMocks()  // Reset mocks between tests
  })

  describe('specific function or component', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test'

      // Act
      const result = someFunction(input)

      // Assert
      expect(result).toBe('expected')
    })
  })
})
```

---

## Best Practices

1. **Clear mocks between tests** with `vi.clearAllMocks()` in `beforeEach`
2. **Test business logic** not implementation details
3. **Use descriptive test names** that explain the expected behavior
4. **Group related tests** with nested `describe` blocks
5. **Export functions** that need direct testing (e.g., utility functions)
6. **Test edge cases**: null values, empty arrays, boundary conditions
7. **Arrange-Act-Assert** pattern for test structure
8. **Mock external dependencies** (APIs, databases, auth)
9. **Avoid testing library internals** (test behavior, not implementation)
10. **Run tests before committing** with `pnpm test:run`

---

## Coverage Guidelines

- **Aim for 80%+ coverage** on critical business logic
- **100% coverage on**:
  - Billing/payment logic
  - Authentication flows
  - Credit calculations
- **Run coverage reports**: `pnpm test:coverage`
- Coverage thresholds can be enforced in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
})
```

---

## When to Write Tests

### Always Test
- ✅ Billing logic (Stripe webhooks, credit calculations)
- ✅ Authentication flows
- ✅ Data validation
- ✅ Critical user paths (chat, message handling)
- ✅ Utility functions with complex logic

### Consider Testing
- 🤔 React components with conditional rendering
- 🤔 API routes with multiple branches
- 🤔 Form validation

### Usually Skip
- ❌ Simple type definitions
- ❌ Constants/configuration files
- ❌ Trivial getters/setters

---

## App-Specific Notes

### Marketing/API (`apps/marketing`)
- **Current status**: ✅ Tests available
- **Test files**: `route.test.ts`, `pricing.test.ts`
- **Focus**: API routes, database logic, webhooks

### Sidepanel (`apps/sidepanel`)
- **Current status**: ⏳ No tests yet
- **Future**: React component tests, hook tests
- **Will need**: `@testing-library/react`, `@testing-library/jest-dom`

### Shared (`apps/shared`)
- **Current status**: ⏳ No tests yet
- **Future**: Zod schema validation tests, utility function tests
