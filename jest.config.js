const nextJest = require("next/jest");

/**
 * Jest via next/jest so tests get the same module resolution the app does —
 * the "@/..." alias from tsconfig, SWC transforms for TS/JSX, and .env loading.
 *
 * Scope: unit tests over the pure logic in src/lib and the email templates.
 * Pages and layouts here are async React Server Components, which React Testing
 * Library cannot render (it has no way to await a component); their behaviour is
 * covered by the Playwright specs in e2e/ instead. Keeping that line explicit is
 * what stops this suite from drifting back into untestable component fiction.
 */
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/__tests__/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/lib/**/*.{ts,tsx}",
    "!src/lib/**/*.d.ts",
    // Excluded from coverage, not from testing: these are thin wrappers over
    // Supabase/Stripe/Prisma clients whose behaviour is the vendor's, not ours.
    "!src/lib/prisma.ts",
    "!src/lib/supabase/**",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};

module.exports = createJestConfig(config);
