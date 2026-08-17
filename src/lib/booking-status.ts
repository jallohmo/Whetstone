/**
 * Booking + session status vocabulary in one place.
 *
 * Booking.status is a plain string column (see schema.prisma), so before this
 * module every screen hard-coded its own `status: { in: [...] }` list. That is
 * exactly how a new status silently disappears bookings from a list: add one,
 * miss a filter, and the row is simply gone from someone's dashboard. Import the
 * groupings below instead of writing a literal array at the call site.
 *
 * The lifecycle:
 *
 *   pending_payment -> confirmed -> in_progress -> awaiting_confirmation -> completed
 *                                       \-> disputed -> completed (ops resolve)
 *                          \-> cancelled (ops refund)
 *
 * "in_progress" is set by the nightly lifecycle cron once the first session's
 * start time has passed. "awaiting_confirmation" is the advisor saying the work
 * is done and the client hasn't accepted yet — the booking is still live, and
 * the money is still held.
 */

export const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "cancelled",
  "disputed",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/**
 * Paid and not yet finished — the booking still needs something from someone.
 * Use for "your bookings" style lists so nothing vanishes mid-flow.
 */
export const LIVE_BOOKING_STATUSES = [
  "confirmed",
  "in_progress",
  "awaiting_confirmation",
] as const satisfies readonly BookingStatus[];

/**
 * Sessions are still expected to happen. Deliberately EXCLUDES
 * awaiting_confirmation: the advisor has said the work is done, so reminders and
 * "upcoming session" panels shouldn't fire for it any more.
 */
export const IN_DELIVERY_BOOKING_STATUSES = [
  "confirmed",
  "in_progress",
] as const satisfies readonly BookingStatus[];

/** Money has been taken and not refunded — for counts and social proof. */
export const PAID_BOOKING_STATUSES = [
  "confirmed",
  "in_progress",
  "awaiting_confirmation",
  "completed",
] as const satisfies readonly BookingStatus[];

/** The advisor may mark the work complete from these. */
export const COMPLETABLE_BOOKING_STATUSES = [
  "confirmed",
  "in_progress",
] as const satisfies readonly BookingStatus[];

/** What the client sees on their bookings list. */
export const CUSTOMER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  in_progress: "In progress",
  awaiting_confirmation: "Confirm completion",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

/** Same states from the advisor's side, where the waiting party differs. */
export const ADVISOR_STATUS_LABEL: Record<string, string> = {
  ...CUSTOMER_STATUS_LABEL,
  awaiting_confirmation: "Awaiting client confirmation",
};

/** Session outcomes the advisor can record once a session's time has passed. */
export const SESSION_OUTCOMES = ["completed", "no_show"] as const;
export type SessionOutcome = (typeof SESSION_OUTCOMES)[number];

/** A session still awaiting an outcome blocks booking completion. */
export const SESSION_OUTCOME_LABEL: Record<string, string> = {
  scheduled: "Not yet recorded",
  completed: "Completed",
  no_show: "No-show",
  rescheduled: "Rescheduled",
};

/** Days the client gets to accept before the nightly sweep accepts for them. */
export const COMPLETION_REMINDER_DAYS = 3;
export const COMPLETION_AUTO_ACCEPT_DAYS = 7;

/**
 * May the advisor mark this booking complete right now, and if not, why not?
 *
 * Pure so both callers agree: the server action enforces it (lib/actions/
 * completion.ts) and the UI disables the button with it (components/booking/
 * CompletionPanel.tsx). Two different answers here is how you get a button that
 * throws when clicked.
 *
 * The session rule is what makes sessionCount mean something — a 3-session
 * package can't be closed, and paid out, after session 1.
 */
export function completionReadiness(
  status: string,
  sessions: readonly { status: string; scheduledAt: Date }[],
  now: Date = new Date(),
): { ready: boolean; reason?: string } {
  if (status === "awaiting_confirmation") {
    return { ready: false, reason: "Already marked complete — it's with the client now." };
  }
  if (!COMPLETABLE_BOOKING_STATUSES.includes(status as "confirmed" | "in_progress")) {
    return { ready: false, reason: "This booking can't be marked complete from its current state." };
  }
  if (sessions.length === 0) {
    return { ready: false, reason: "This booking has no sessions to complete." };
  }

  const pending = sessions.filter((s) => s.status === "scheduled");
  if (pending.length === 0) return { ready: true };

  const anyPast = sessions.some((s) => s.scheduledAt <= now);
  return {
    ready: false,
    reason: anyPast
      ? `Record an outcome for every session first — ${pending.length} of ${sessions.length} still to go.`
      : "Available once your first session has taken place.",
  };
}

/** The date the day-7 sweep will accept on the client's behalf. */
export function autoAcceptDeadline(advisorCompletedAt: Date): Date {
  return new Date(advisorCompletedAt.getTime() + COMPLETION_AUTO_ACCEPT_DAYS * 86_400_000);
}
