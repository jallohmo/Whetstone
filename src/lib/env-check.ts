/**
 * Central inventory of the environment variables the app depends on, used by
 * both the startup validator (src/instrumentation.ts) and the /api/health
 * endpoint. Each spec lists the accepted variable NAMES (the app supports both
 * its own names and the Supabase↔Vercel integration's names).
 *
 * SAFE TO SURFACE: this module only ever reads whether a variable is *present*,
 * never its value — so /api/health can report status without leaking secrets.
 */
type EnvSpec = { label: string; required: boolean; names: string[] };

export const ENV_SPECS: EnvSpec[] = [
  { label: "Database URL", required: true, names: ["DATABASE_URL", "POSTGRES_PRISMA_URL"] },
  { label: "Supabase URL", required: true, names: ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] },
  {
    label: "Supabase anon/publishable key",
    required: true,
    names: ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  },
  {
    label: "Supabase service-role/secret key",
    required: true,
    names: ["SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"],
  },
  { label: "Stripe secret key", required: false, names: ["STRIPE_SECRET_KEY"] },
  { label: "Stripe webhook secret", required: false, names: ["STRIPE_WEBHOOK_SECRET"] },
  { label: "Daily.co API key", required: false, names: ["DAILY_API_KEY"] },
];

export type EnvCheckEntry = {
  label: string;
  required: boolean;
  present: boolean;
  /** Which of the accepted names actually supplied the value (null if none). */
  resolvedFrom: string | null;
  /** All accepted names, so a missing-var message can list the options. */
  accepts: string[];
};

export function checkEnv(): EnvCheckEntry[] {
  return ENV_SPECS.map((spec) => {
    const resolvedFrom = spec.names.find((name) => Boolean(process.env[name])) ?? null;
    return {
      label: spec.label,
      required: spec.required,
      present: resolvedFrom !== null,
      resolvedFrom,
      accepts: spec.names,
    };
  });
}

export function missingRequired(entries: EnvCheckEntry[] = checkEnv()): EnvCheckEntry[] {
  return entries.filter((entry) => entry.required && !entry.present);
}
