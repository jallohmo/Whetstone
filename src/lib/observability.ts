/**
 * Error reporting — SERVER ONLY. Single integration point so runtime failures are
 * captured consistently. Works today via console; automatically forwards to Sentry
 * once a DSN is configured (SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN). No account →
 * no-op beyond the console log, so this is safe to ship inert.
 *
 * To activate Sentry: create a project at sentry.io, then set SENTRY_DSN in the
 * environment and redeploy. (For source-mapped stack traces, additionally run
 * `npx @sentry/wizard@latest -i nextjs` later.)
 */
import * as Sentry from "@sentry/nextjs";

function dsn(): string | undefined {
  return process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
}

let initialized = false;

/** Called once at server startup (from src/instrumentation.ts). */
export function initObservability(): void {
  if (initialized || !dsn()) return;
  Sentry.init({
    dsn: dsn(),
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
  initialized = true;
}

/**
 * Report a caught error. Always logs to the server console (visible in Vercel
 * runtime logs); also sends to Sentry when configured.
 */
export function reportError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  console.error(`${context} —`, error);
  if (!dsn()) return;
  try {
    Sentry.captureException(error, { tags: { context }, extra });
  } catch {
    // Sentry not initialised yet — the console.error above is the fallback.
  }
}
