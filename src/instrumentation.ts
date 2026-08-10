/**
 * Next.js instrumentation — runs once per server runtime at startup. Two jobs:
 *   1. Validate required environment variables and log a clear, actionable
 *      message if any are missing (fail-loud instead of a cryptic runtime crash).
 *   2. Initialise error reporting (Sentry) if a DSN is configured.
 *
 * Enabled via `experimental.instrumentationHook` in next.config.mjs.
 */
export async function register() {
  const { checkEnv, missingRequired } = await import("./lib/env-check");

  const entries = checkEnv();
  const missing = missingRequired(entries);

  if (missing.length > 0) {
    const lines = missing.map(
      (m) => `  ✗ ${m.label} — set one of: ${m.accepts.join(" | ")}`,
    );
    console.error(
      `[startup] Missing ${missing.length} required environment variable(s):\n${lines.join("\n")}\n` +
        `[startup] The app will not function correctly until these are set. See /api/health for live status.`,
    );
  } else {
    console.log("[startup] Environment check passed — all required variables present.");
  }

  const { initObservability } = await import("./lib/observability");
  initObservability();
}
