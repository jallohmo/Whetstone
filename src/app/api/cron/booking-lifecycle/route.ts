import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyCompletionReminder } from "@/lib/email/notify";
import { acceptBookingCompletion } from "@/lib/booking-completion";
import { reportError } from "@/lib/observability";
import {
  COMPLETION_AUTO_ACCEPT_DAYS,
  COMPLETION_REMINDER_DAYS,
} from "@/lib/booking-status";

/**
 * Booking-lifecycle cron. Same shape and the same CRON_SECRET guard as the
 * session-reminder route (see vercel.json for the schedule).
 *
 * Three sweeps, each independent so one failing doesn't strand the others:
 *
 *  1. start   — confirmed bookings whose first session has begun become
 *               "in_progress". Before this, that status existed in the schema and
 *               in six queries but was never actually set by anything.
 *  2. remind  — bookings sitting in "awaiting_confirmation" past the reminder
 *               window get one nudge, stamped so it only ever goes once.
 *  3. accept  — bookings still unconfirmed past the auto-accept window are
 *               accepted on the client's behalf, which releases the advisor's
 *               payout. Without this the two-sided flow would just move the old
 *               "client never came back, advisor never got paid" deadlock one
 *               step later.
 *
 * Every write is an updateMany guarded on the state it expects to change, so
 * overlapping runs can't double-send or double-release.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY = 86_400_000;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { started: 0, reminded: 0, autoAccepted: 0 };
  let failed = false;

  for (const [key, run] of [
    ["started", () => sweepStarted(now)],
    ["reminded", () => sweepReminders(now)],
    ["autoAccepted", () => sweepAutoAccept(now)],
  ] as const) {
    try {
      results[key] = await run();
    } catch (err) {
      failed = true;
      reportError(`booking-lifecycle: ${key} sweep failed`, err);
    }
  }

  return NextResponse.json({ ok: !failed, ...results }, { status: failed ? 500 : 200 });
}

/** confirmed -> in_progress once the earliest session has started. */
async function sweepStarted(now: Date): Promise<number> {
  const due = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      sessions: { some: { scheduledAt: { lte: now } } },
    },
    select: { id: true },
  });

  let started = 0;
  for (const b of due) {
    const moved = await prisma.booking.updateMany({
      where: { id: b.id, status: "confirmed" },
      data: { status: "in_progress" },
    });
    started += moved.count;
  }
  return started;
}

/** One nudge per booking, `COMPLETION_REMINDER_DAYS` after the advisor marked it. */
async function sweepReminders(now: Date): Promise<number> {
  const due = await prisma.booking.findMany({
    where: {
      status: "awaiting_confirmation",
      completionRemindedAt: null,
      advisorCompletedAt: { lte: new Date(now.getTime() - COMPLETION_REMINDER_DAYS * DAY) },
    },
    select: { id: true },
  });

  let sent = 0;
  for (const b of due) {
    // Atomic claim: only the run that flips null -> now dispatches the email.
    const claimed = await prisma.booking.updateMany({
      where: { id: b.id, completionRemindedAt: null, status: "awaiting_confirmation" },
      data: { completionRemindedAt: new Date() },
    });
    if (claimed.count !== 1) continue;

    try {
      await notifyCompletionReminder(b.id);
      sent++;
    } catch (err) {
      reportError("booking-lifecycle: reminder dispatch failed", err, { bookingId: b.id });
    }
  }
  return sent;
}

/** Accept on the client's behalf once the window has run out, releasing the payout. */
async function sweepAutoAccept(now: Date): Promise<number> {
  const due = await prisma.booking.findMany({
    where: {
      status: "awaiting_confirmation",
      advisorCompletedAt: { lte: new Date(now.getTime() - COMPLETION_AUTO_ACCEPT_DAYS * DAY) },
    },
    select: { id: true },
  });

  let accepted = 0;
  for (const b of due) {
    try {
      // Guards on status internally and no-ops if the client just beat us to it.
      if (await acceptBookingCompletion(b.id, { auto: true })) accepted++;
    } catch (err) {
      reportError("booking-lifecycle: auto-accept failed", err, { bookingId: b.id });
    }
  }
  return accepted;
}
