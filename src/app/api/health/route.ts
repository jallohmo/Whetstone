import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkEnv } from "@/lib/env-check";

// Diagnostics endpoint — reports live config + connectivity so a broken
// deployment self-describes in seconds instead of requiring log spelunking.
// Reports variable NAMES and presence only — never secret values.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = checkEnv();

  const dbSource = process.env.DATABASE_URL
    ? "DATABASE_URL"
    : process.env.POSTGRES_PRISMA_URL
      ? "POSTGRES_PRISMA_URL"
      : null;

  let database: { ok: boolean; usingVar: string | null; error?: string };
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = { ok: true, usingVar: dbSource };
  } catch (err) {
    // First line only — enough to diagnose (e.g. "Can't reach database server
    // at …"), without dumping a full stack to a public endpoint.
    database = { ok: false, usingVar: dbSource, error: (err as Error).message.split("\n")[0] };
  }

  const missingRequired = env.filter((e) => e.required && !e.present).map((e) => e.label);
  const ok = database.ok && missingRequired.length === 0;

  return NextResponse.json(
    {
      ok,
      time: new Date().toISOString(),
      database,
      env: env.map(({ label, required, present, resolvedFrom }) => ({
        label,
        required,
        present,
        resolvedFrom,
      })),
      services: {
        stripePayments: Boolean(process.env.STRIPE_SECRET_KEY),
        stripeWebhook: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        video: Boolean(process.env.DAILY_API_KEY),
        errorReporting: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
      },
    },
    { status: ok ? 200 : 503 },
  );
}
