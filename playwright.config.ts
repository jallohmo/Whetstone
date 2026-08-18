import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for Whetstone E2E Tests
 *
 * Runs on:
 * - Main branch and releases (full matrix)
 * - Nightly schedule (full matrix)
 * - Manual trigger with full report
 */

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

/**
 * Escape hatch for environments that already have a browser on disk and cannot
 * reach Playwright's CDN (sandboxes, air-gapped runners). CI leaves this unset
 * and uses `npx playwright install` as normal.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined
const launchOptions = executablePath ? { executablePath } : undefined

/**
 * The signed-in check seeds real users and a booking. It is about server state
 * and configuration, not rendering, so it runs once under its own project rather
 * than five times across the browser matrix — the cross-browser projects ignore it.
 */
const SIGNED_IN_SPEC = '**/checkout.spec.ts'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30 * 1000, // 30s per test

  // Reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['github'],
  ],

  // Global settings
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30 * 1000,
    actionTimeout: 10 * 1000,
  },

  // Browser configurations
  projects: [
    {
      name: 'chromium',
      testIgnore: SIGNED_IN_SPEC,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },

    {
      name: 'firefox',
      testIgnore: SIGNED_IN_SPEC,
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testIgnore: SIGNED_IN_SPEC,
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      testIgnore: SIGNED_IN_SPEC,
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      testIgnore: SIGNED_IN_SPEC,
      use: { ...devices['iPhone 12'] },
    },

    // Signed-in checkout check. Skips itself when the test project's credentials
    // aren't in the environment (see e2e/fixtures/checkout-fixtures.ts).
    {
      name: 'signed-in',
      testMatch: SIGNED_IN_SPEC,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
  ],

  // Web server configuration
  webServer: {
    command: 'npm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    /**
     * INSURANCE_COVERAGE_ACTIVE is passed explicitly because its absence is what
     * broke checkout in production: the gate compares against the literal string
     * "true", so unset means "no cover" and payment throws. Setting it here means
     * the spec asserts the covered path deliberately rather than by accident.
     */
    env: {
      ...(process.env as Record<string, string>),
      INSURANCE_COVERAGE_ACTIVE: process.env.INSURANCE_COVERAGE_ACTIVE ?? 'true',
    },
  },
})
