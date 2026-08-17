import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifySessionReminder } from "@/lib/email/notify";
import { reportError } from "@/lib/observability";
import { IN_DELIVERY_BOOKING_STATUSES } from "@/lib/booking-status";

/**
 * Session-reminder cron. Invoked on a schedule by Vercel Cron (see vercel.json)
 * and protected by CRON_SECRET — Vercel sends it as `Authorization: Bearer
 * <CRON_SECRET>`, and we refuse the request if it doesn't match (or the secret
 * isn't configured), so the endpoint can't be triggered by anyone else.
 *
 * Two windows: a day-ahead nudge (>1h and <=24h out) and a final-hour nudge
 * (<=1h out), each tracked by its own column so it sends exactly once. The email
 * itself derives "how soon" from the real time gap, so a late booking that only
 * ever hits the 1h window is still worded correctly.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOUR = 3_600_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  try {
    const sent24h = await processWindow("24h", new Date(now.getTime() + HOUR), new Date(now.getTime() + 24 * HOUR));
    const sent1h = await processWindow("1h", now, new Date(now.getTime() + HOUR));
    return NextResponse.json({ ok: true, sent24h, sent1h });
  } catch (err) {
    reportError("session-reminders: run failed", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function processWindow(which: "24h" | "1h", lower: Date, upper: Date): Promise<number> {
  const candidates = await prisma.session.findMany({
    where: {
      scheduledAt: { gt: lower, lte: upper },
      booking: { status: { in: [...IN_DELIVERY_BOOKING_STATUSES] } },
      ...(which === "24h" ? { reminded24hAt: null } : { reminded1hAt: null }),
    },
    select: { id: true },
  });

  let sent = 0;
  for (const s of candidates) {
    // Atomic claim: only the invocation that flips null -> now dispatches, so
    // overlapping cron runs can never double-send the same reminder.
    const claimed = await prisma.session.updateMany({
      where: which === "24h" ? { id: s.id, reminded24hAt: null } : { id: s.id, reminded1hAt: null },
      data: which === "24h" ? { reminded24hAt: new Date() } : { reminded1hAt: new Date() },
    });
    if (claimed.count !== 1) continue;

    try {
      await notifySessionReminder(s.id);
      sent++;
    } catch (err) {
      reportError("session-reminders: dispatch failed", err, { sessionId: s.id });
    }
  }
  return sent;
}
