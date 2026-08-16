# Whetstone Platform - Testing Setup Guide

## Overview

This guide covers setting up and running the test suite for the Whetstone customer platform. The test infrastructure uses Jest, React Testing Library, and Playwright for comprehensive coverage across unit, integration, and E2E tests.

---

## 1. Installation & Configuration

### 1.1 Install Testing Dependencies

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  @types/jest \
  jest-mock-extended \
  jest-mock-open-editor \
  ts-jest \
  @testing-library/next
```

### 1.2 Install E2E Testing (Optional - Playwright)

```bash
npm install --save-dev \
  @playwright/test \
  @testing-library/playwright
```

### 1.3 Setup Configuration Files

#### Create `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

#### Create `jest.setup.js`

```javascript
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      isPreview: false,
    }
  },
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
```

#### Create `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### 1.4 Update `package.json` Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm run test:coverage && npm run test:e2e"
  }
}
```

---

## 2. Running Tests

### 2.1 Run All Unit Tests

```bash
npm test
```

### 2.2 Run Tests in Watch Mode

```bash
npm run test:watch
```

### 2.3 Run Tests with Coverage Report

```bash
npm run test:coverage
```

Coverage report will be generated in `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed report.

### 2.4 Run Specific Test File

```bash
npm test -- auth.test.tsx
npm test -- booking.test.tsx
npm test -- advisor-discovery.test.tsx
```

### 2.5 Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="TC-BOOK-001"
```

### 2.6 Run E2E Tests

```bash
npm run test:e2e
```

### 2.7 Run E2E Tests in UI Mode

```bash
npm run test:e2e:ui
```

### 2.8 Debug Tests

```bash
npm run test:debug
```

Then open Chrome DevTools to debug.

---

## 3. Test Organization

### 3.1 Directory Structure

```
Whetstone/
├── __tests__/
│   ├── client-platform.test.cases.md    # Test specification (this document)
│   ├── TESTING_SETUP.md                  # Setup instructions
│   ├── examples/
│   │   ├── auth.test.tsx                 # Authentication tests
│   │   ├── booking.test.tsx              # Booking flow tests
│   │   ├── advisor-discovery.test.tsx    # Advisor discovery tests
│   │   ├── need-intake.test.tsx          # Need creation tests
│   │   ├── messaging.test.tsx            # Messaging tests
│   │   └── account.test.tsx              # Account management tests
│   └── utils/
│       ├── test-helpers.ts               # Shared test utilities
│       ├── mock-data.ts                  # Mock data factories
│       └── custom-render.tsx             # Custom render with providers
│
├── e2e/
│   ├── auth.spec.ts                      # E2E auth flows
│   ├── booking.spec.ts                   # E2E booking flows
│   ├── advisor-discovery.spec.ts         # E2E advisor flows
│   └── checkout.spec.ts                  # E2E payment flows
│
├── src/
│   ├── __tests__/                        # Colocated tests (optional)
│   │   └── components/
│   │       ├── Button.test.tsx
│   │       └── Card.test.tsx
│
├── jest.config.js
├── jest.setup.js
├── playwright.config.ts
└── package.json
```

### 3.2 Test File Naming

- Unit tests: `[ComponentName].test.tsx`
- Integration tests: `[Feature].test.tsx`
- E2E tests: `[Flow].spec.ts`
- Test cases document: `[Feature].test.cases.md`

---

## 4. Testing Utilities & Helpers

### 4.1 Create `__tests__/utils/test-helpers.ts`

```typescript
import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

/**
 * Custom render function that wraps components with necessary providers
 * (e.g., Redux store, Router, Auth context, etc.)
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <>
        {/* Wrap with auth context provider */}
        {/* Wrap with router provider */}
        {/* Wrap with other necessary providers */}
        {children}
      </>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Wait for a specific duration (useful for async operations)
 */
export const waitMs = (ms: number) => 
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Get element by role with error handling
 */
export function getButton(name: string | RegExp, container?: HTMLElement) {
  const getAllButtons = container 
    ? container.querySelectorAll('button')
    : document.querySelectorAll('button')
  
  return Array.from(getAllButtons).find((btn) => {
    const text = btn.textContent?.toLowerCase()
    const pattern = typeof name === 'string' ? name.toLowerCase() : name
    return text?.match(pattern)
  })
}
```

### 4.2 Create `__tests__/utils/mock-data.ts`

```typescript
/**
 * Factory functions for creating mock data
 */

export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
    fullName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    phone: '+61412345678',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date(),
    ...overrides,
  }
}

export function createMockAdvisor(overrides = {}) {
  return {
    id: 'advisor-123',
    userId: 'user-123',
    bio: 'Expert consultant',
    headline: 'Senior Advisor',
    yearsExperience: 10,
    verificationStatus: 'VERIFIED',
    identityCheckPassed: true,
    insuranceCoverageActive: true,
    avatarUrl: 'https://example.com/advisor.jpg',
    rating: 4.8,
    reviewCount: 45,
    hourlyRate: 150,
    specialties: ['React', 'Node.js'],
    availabilitySlots: [
      {
        id: 'slot-1',
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 86400000 + 3600000), // +1 hour
        isAvailable: true,
      },
    ],
    ...overrides,
  }
}

export function createMockNeed(overrides = {}) {
  return {
    id: 'need-123',
    customerId: 'user-123',
    industryId: 'industry-1',
    subSpecialtyId: 'specialty-1',
    title: 'React Performance Optimization',
    description: 'Need help optimizing React component rendering',
    status: 'ACTIVE',
    createdAt: new Date(),
    ...overrides,
  }
}

export function createMockBooking(overrides = {}) {
  return {
    id: 'booking-123',
    customerId: 'user-123',
    advisorId: 'advisor-123',
    needId: 'need-123',
    startTime: new Date(Date.now() + 86400000), // Tomorrow
    endTime: new Date(Date.now() + 86400000 + 3600000), // +1 hour
    duration: 60,
    totalAmount: 150,
    currency: 'AUD',
    status: 'CONFIRMED',
    stripePaymentIntentId: 'pi_123',
    createdAt: new Date(),
    ...overrides,
  }
}

export function createMockReview(overrides = {}) {
  return {
    id: 'review-123',
    bookingId: 'booking-123',
    advisorId: 'advisor-123',
    customerId: 'user-123',
    rating: 5,
    content: 'Excellent session!',
    createdAt: new Date(),
    ...overrides,
  }
}
```

### 4.3 Create `__tests__/utils/custom-render.tsx`

```typescript
import { render as rtlRender, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { RouterProvider } from '@/lib/router-context'

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RouterProvider>
        {children}
      </RouterProvider>
    </AuthProvider>
  )
}

const render = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => rtlRender(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { render }
```

---

## 5. Mocking Strategy

### 5.1 Mock API Requests

```typescript
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('/api/advisors', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json([
        { id: '1', name: 'Advisor 1', rating: 4.8 },
        { id: '2', name: 'Advisor 2', rating: 4.5 },
      ])
    )
  }),

  rest.post('/api/bookings', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id: 'booking-123', status: 'confirmed' })
    )
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

Install MSW:
```bash
npm install --save-dev msw
```

### 5.2 Mock Authentication

```typescript
jest.mock('@/lib/auth', () => ({
  useAuth: jest.fn(() => ({
    user: createMockUser(),
    isLoading: false,
    isAuthenticated: true,
    signIn: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
  })),
}))
```

### 5.3 Mock Supabase

```typescript
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  })),
}))
```

---

## 6. Writing Tests

### 6.1 Basic Test Structure

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should do something', async () => {
    // Arrange
    const { getByRole } = render(<Component />)

    // Act
    const button = getByRole('button', { name: /submit/i })
    await userEvent.click(button)

    // Assert
    expect(screen.getByText(/success/i)).toBeInTheDocument()
  })
})
```

### 6.2 Async Testing

```typescript
it('should load data', async () => {
  render(<AdvisorList />)

  // Wait for advisors to load
  const advisorName = await screen.findByText(/Sarah Smith/i)
  expect(advisorName).toBeInTheDocument()
})
```

### 6.3 User Interaction Testing

```typescript
it('should handle form submission', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)

  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password')
  await user.click(screen.getByRole('button', { name: /login/i }))

  expect(screen.getByText(/welcome/i)).toBeInTheDocument()
})
```

---

## 7. Continuous Integration

### 7.1 GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run typecheck

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
```

---

## 8. Code Coverage Goals

| Category | Target | Minimum |
|---|---|---|
| Overall | > 80% | > 75% |
| Branches | > 75% | > 70% |
| Functions | > 80% | > 75% |
| Lines | > 80% | > 75% |
| Critical Paths* | > 95% | > 90% |

*Critical paths include: authentication, payments, bookings, need creation

### View Coverage Report

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

---

## 9. Best Practices

### 9.1 Test Naming

- ✅ `should display error message when email is invalid`
- ✅ `TC-AUTH-003: should validate password requirements`
- ❌ `test password validation`
- ❌ `test1`

### 9.2 Test Independence

- Tests should not depend on execution order
- Use `beforeEach` to set up fresh state
- Clean up side effects in `afterEach`

### 9.3 Avoid Testing Implementation Details

- ❌ `expect(component.state.isLoading).toBe(false)`
- ✅ `expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()`

### 9.4 Use Data Attributes for Brittle Selectors

```typescript
// Bad - too brittle
getByRole('button').parentElement?.parentElement

// Good - use data-testid as fallback
<button data-testid="submit-button">Submit</button>
screen.getByTestId('submit-button')
```

### 9.5 Mock Sparingly

- Only mock external dependencies (APIs, libraries)
- Test real component behavior when possible
- Avoid mocking the component under test

### 9.6 Async Patterns

```typescript
// Good - use findBy for async content
await screen.findByText(/loaded content/i)

// Bad - using waitFor for everything
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument()
})
```

---

## 10. Troubleshooting

### Common Issues

#### Act Warning

```
"Warning: An update to Component inside a test was not wrapped in act(...)"
```

Solution: Ensure async operations are awaited:

```typescript
await user.click(button) // Not: fireEvent.click(button)
await screen.findByText(...) // Not: getByText (if async)
```

#### Timeout Errors

```typescript
// Increase timeout for specific test
it('should load large dataset', async () => {
  // ... test code
}, 10000) // 10 second timeout
```

#### State Between Tests

```typescript
// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks()
})
```

---

## 11. Additional Resources

- [Jest Documentation](https://jestjs.io)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Testing](https://playwright.dev)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## 12. Contact & Support

- **Test Lead**: [Your Name]
- **Slack**: `#whetstone-testing`
- **Issues**: GitHub Issues with label `type:test`

Last Updated: 2026-08-16
