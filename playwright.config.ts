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
 * The authenticated journey seeds real users and walks one revenue path end to
 * end. It is about server behaviour, not rendering, so running it five times
 * across the browser matrix would only multiply the seeding cost and the rows
 * left behind. The cross-browser projects skip it; the `journey` project below
 * owns it and runs it once, on Chromium.
 */
const JOURNEY_SPEC = '**/booking-journey.spec.ts'

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
      testIgnore: JOURNEY_SPEC,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },

    {
      name: 'firefox',
      testIgnore: JOURNEY_SPEC,
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      testIgnore: JOURNEY_SPEC,
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      testIgnore: JOURNEY_SPEC,
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      testIgnore: JOURNEY_SPEC,
      use: { ...devices['iPhone 12'] },
    },

    // Signed-in, database-backed journey. Skips itself when the test project's
    // credentials aren't in the environment (see e2e/fixtures/journey-fixtures.ts).
    {
      name: 'journey',
      testMatch: JOURNEY_SPEC,
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
     * The app under test needs the same configuration the deployed app does.
     * INSURANCE_COVERAGE_ACTIVE is set explicitly because its absence is exactly
     * what broke checkout in production: the gate in lib/platform-config.ts
     * compares against the literal string "true", so unset means "no cover" and
     * every payment throws. Passing it here means the journey exercises the
     * covered path; leaving it out would make the suite fail for the same reason
     * production did, which is the point of asserting the banner in step 6.
     */
    env: {
      ...process.env as Record<string, string>,
      INSURANCE_COVERAGE_ACTIVE: process.env.INSURANCE_COVERAGE_ACTIVE ?? 'true',
    },
  },
})
