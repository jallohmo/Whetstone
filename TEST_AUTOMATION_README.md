# Test Automation Setup for Whetstone

## Overview

This document explains the automated testing infrastructure for Whetstone. Tests run automatically on:
- Every push to a branch
- Every pull request
- Nightly schedule (comprehensive E2E tests)
- Manual triggers

## What Gets Tested Automatically

### Stage 1: Lint & Type Check (Every Push)
```
ESLint → TypeScript → Status Check
```
- Code style validation
- Type safety
- Pre-commit checks

### Stage 2: Unit & Integration Tests (Every Push)
```
Jest Unit Tests → Coverage Report → Codecov Upload
```
- Run on Node 18.x and 20.x (matrix)
- Coverage tracked and reported
- Must pass to merge PR

### Stage 3: Build Check (Every Push)
```
Next.js Build → Artifact Storage
```
- Ensures application builds without errors
- Build artifacts stored for later use

### Stage 4: E2E Tests (Main Branch + Nightly)
```
Playwright Tests (5 browsers) → HTML Report → Artifact Upload
```
- Full user flows tested
- Runs on: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- Takes ~15-20 minutes
- Reports uploaded as artifacts

Two suites:

| Suite | Project(s) | Needs credentials? |
|---|---|---|
| `funnel.spec.ts` — anonymous funnel, gating, auth pages | all 5 browsers | No |
| `checkout.spec.ts` — signed-in client can reach checkout, cover reads active | `signed-in` (Chromium once) | Yes |

#### Enabling the signed-in check

`checkout.spec.ts` guards the outage where `INSURANCE_COVERAGE_ACTIVE` was missing
from the deployed environment and every payment threw. Checkout is behind a
session, so the check needs one — which means a **disposable** Supabase project,
never production. Without these secrets it skips itself and the rest of the suite
is unaffected, so CI stays green either way.

Add as repository secrets:

| Secret | What it is |
|---|---|
| `E2E_SUPABASE_URL` | Test project's API URL |
| `E2E_SUPABASE_ANON_KEY` | Test project's anon key |
| `E2E_SUPABASE_SERVICE_ROLE_KEY` | Service-role key — mints confirmed test users |
| `E2E_DATABASE_URL` | Pooled connection to the test database |

The test database needs the migrations in `supabase/migrations/` applied once.
No seeding is required: the fixture creates its own taxonomy row, package,
users and booking, and deletes them afterwards by the ids it captured.

Locally, export the same values (unprefixed) and run:

```bash
npm run build && npx playwright test --project=signed-in
```

### Stage 5: Performance (Main Branch + Nightly)
```
Lighthouse CI → Performance Report → Metrics Tracked
```
- Core Web Vitals monitored
- FCP, LCP, CLS measured
- Historical trends tracked

### Stage 6: Security (Every Push)
```
Snyk Scan → Vulnerability Report
```
- Dependency vulnerabilities
- Auto-updates suggestions
- Severity filtering

### Stage 7: Accessibility (Main Branch + Nightly)
```
Pa11y CI → WCAG Compliance Report
```
- WCAG 2.0 Level AA compliance
- Automated flagging of accessibility issues
- Multiple pages scanned

## Running Tests Locally

### Install Testing Dependencies

```bash
# Jest + React Testing Library (for unit/integration tests)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom ts-jest

# Playwright (for E2E tests)
npm install --save-dev @playwright/test

# Performance testing
npm install --save-dev @lighthouse-labs/lighthouserc

# Accessibility testing
npm install --save-dev pa11y pa11y-ci

# Security scanning
npm install --save-dev snyk
```

Or run everything:
```bash
npm install
```

### Run Unit Tests

```bash
# Run all tests
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage

# Debug in Node inspector
npm run test:debug
```

### Run E2E Tests

```bash
# Run all E2E tests (Playwright)
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/booking-flow.spec.ts

# Run specific test by name
npx playwright test --grep "TC-BOOK-001"

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run All Tests

```bash
npm run test:all
```

This runs:
1. Unit/integration tests with coverage
2. Full E2E test suite

Takes ~30-45 minutes.

## Test Files Organization

```
Whetstone/
├── .github/workflows/
│   └── test-automation.yml          # CI/CD pipeline definition
│
├── __tests__/
│   ├── client-platform.test.cases.md # Test specification
│   ├── TESTING_SETUP.md              # Setup guide
│   ├── examples/
│   │   ├── auth.test.tsx
│   │   ├── booking.test.tsx
│   │   └── advisor-discovery.test.tsx
│   └── utils/
│       ├── test-helpers.ts
│       ├── mock-data.ts
│       └── custom-render.tsx
│
├── e2e/
│   ├── booking-flow.spec.ts         # Booking flow E2E tests
│   └── auth.spec.ts                 # Authentication E2E tests
│
├── playwright.config.ts              # Playwright configuration
├── jest.config.js                    # Jest configuration
├── jest.setup.js                     # Jest setup
├── lighthouserc.json                 # Lighthouse CI config
└── .pa11yci.json                    # Pa11y accessibility config
```

## Test Naming Convention

Tests use a naming convention that links to the test specification:

```
TC-FEATURE-NUMBER: Description
  │     │        │     │
  │     │        │     └─ What the test does
  │     │        └────── Test number (001, 002, etc.)
  │     └────────────── Feature area (AUTH, BOOK, ADVISOR, etc.)
  └─────────────────── Test Case prefix

Example: TC-BOOK-001: Create need with valid industry and description
```

This makes it easy to:
- Find tests in the specification document
- Track coverage per feature area
- Link bugs to test cases

## CI/CD Pipeline Details

### GitHub Actions Workflow

The workflow is defined in `.github/workflows/test-automation.yml` and includes:

**Triggers:**
- ✅ Push to main or develop branches
- ✅ Pull request to main or develop
- ✅ Scheduled nightly (2 AM UTC)
- ✅ Manual workflow dispatch

**Jobs:**
1. `lint-and-type` - ESLint + TypeScript
2. `unit-tests` - Jest tests (2 Node versions)
3. `build` - Next.js build
4. `e2e-tests` - Playwright tests (only on main/nightly)
5. `performance` - Lighthouse CI (only on main/nightly)
6. `security` - Snyk vulnerability scan
7. `accessibility` - Pa11y WCAG audit (only on main/nightly)
8. `test-status` - Final check before merge

### Test Results

After tests run, artifacts are uploaded:
- `test-results-*.json` - Unit test results
- `playwright-report/` - E2E test report
- `pa11y-results.json` - Accessibility audit
- Coverage reports - Code coverage metrics

View detailed reports:
1. Go to GitHub Actions → workflow run
2. Scroll down to "Artifacts" section
3. Download and open HTML reports

## Environment Variables

For local E2E testing, set these environment variables:

```bash
# Optional - defaults to http://localhost:3000
export PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000

# For authentication tests (use test account)
export TEST_EMAIL=test@example.com
export TEST_PASSWORD=YourTestPassword123!

# For Snyk security scanning
export SNYK_TOKEN=your-snyk-token
```

## Common Tasks

### Add a New Test

1. Create test file in `__tests__/examples/` or `e2e/`
2. Follow existing test patterns
3. Use TC-FEATURE-NUMBER naming
4. Reference test specification

### Mark Test as Pending

```typescript
test.skip('TC-BOOK-025: Future feature', async ({ page }) => {
  // Test implementation
})
```

### Debug a Failing Test

```bash
# Run with visual debugging
npm run test:e2e:debug -- --grep "TC-BOOK-001"

# View detailed logs
npm run test:e2e -- --trace on --verbose
```

### Update Baseline for Visual Tests

```bash
# Update Playwright snapshots
npx playwright test --update-snapshots
```

## Coverage Goals

Maintain these coverage targets:

| Category | Target | Min |
|---|---|---|
| Overall | > 80% | 75% |
| Branches | > 75% | 70% |
| Functions | > 80% | 75% |
| Lines | > 80% | 75% |
| Critical Paths* | > 95% | 90% |

*Critical: auth, payments, bookings, need creation

View coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Troubleshooting

### Tests Fail Locally But Pass in CI

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build

# Try again
npm test
```

### Playwright Tests Timeout

```bash
# Increase timeout
export PLAYWRIGHT_TEST_TIMEOUT=60000  # 60 seconds

# Run with verbose output
npm run test:e2e -- --verbose
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Snyk Token Not Found

```bash
# For local development, Snyk is optional
# To enable, add token to .env.local or as environment variable
export SNYK_TOKEN=your-token
```

## Performance Tips

### Faster Local Testing

```bash
# Skip E2E (just run unit tests)
npm test

# Run specific test file
npm test -- auth.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="TC-AUTH"
```

### Parallel Execution

Tests run in parallel by default. Control workers:

```bash
# Use specific number of workers
npx playwright test --workers=4
```

### Caching

Git Actions caches:
- `node_modules` (npm cache)
- Build artifacts
- Playwright browsers

Caching makes subsequent runs ~3x faster.

## Resources

- [Jest Documentation](https://jestjs.io)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev)
- [Test Specification](./\_\_tests\_\_/client-platform.test.cases.md)
- [Testing Setup Guide](./\_\_tests\_\_/TESTING_SETUP.md)

## Next Steps

1. ✅ GitHub Actions workflow configured
2. ✅ E2E tests created (booking-flow, auth)
3. ⏭️ Add more E2E tests (advisor discovery, sessions)
4. ⏭️ Set up test data fixtures
5. ⏭️ Configure Percy for visual regression (optional)
6. ⏭️ Add performance budgets

## Support

- **Questions?** Check the test specification in `__tests__/client-platform.test.cases.md`
- **Issues?** File GitHub issue with label `type:test`
- **Slack**: `#whetstone-testing`

---

Last Updated: 2026-08-16
