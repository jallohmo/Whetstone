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
 * How long an unpaid booking is given before it is nudged, then cancelled.
 *
 * A booking sits at "pending_payment" from the moment it is created, and it
 * holds the advisor's availability slot the whole time — so an abandoned
 * checkout is not a harmless dead row, it is a slot nobody else can book. One
 * reminder at +3h, and the sweep cancels at +24h and hands the slot back.
 *
 * Both windows are measured from Booking.createdAt and swept hourly by
 * api/cron/booking-lifecycle.
 */
export const PAYMENT_REMINDER_HOURS = 3;
export const PAYMENT_EXPIRY_HOURS = 24;

/** When an unpaid booking created at `createdAt` will be cancelled. */
export function paymentExpiryDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PAYMENT_EXPIRY_HOURS * 3_600_000);
}

/**
 * How long after creation checkout still counts as part of the booking funnel.
 *
 * Someone walking the funnel reaches checkout seconds after the booking row is
 * written; someone arriving from the reminder email or their bookings list is
 * coming back to a booking they left. The two need different screens — a
 * progress stepper and "here's your total" for the first, a deadline and "this
 * isn't confirmed yet" for the second — and createdAt is what separates them
 * without a query parameter that can be dropped, shared or forged.
 *
 * Erring long is the safe direction: a first-timer who took 40 minutes to decide
 * is better served by the returning view (which tells them when the hold ends)
 * than a returning client would be by the funnel view.
 */
export const CHECKOUT_RESUME_AFTER_MINUTES = 30;

/** Is this checkout visit a return to an abandoned booking rather than the funnel? */
export function isResumedCheckout(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() >= CHECKOUT_RESUME_AFTER_MINUTES * 60_000;
}

/**
 * May this unpaid booking still be paid for, and if not, why not?
 *
 * Pure so both callers agree, the same arrangement as completionReadiness: the
 * server action enforces it (lib/actions/payments.ts) and the checkout screen
 * renders the refusal with it. Two different answers here is how you get a
 * payment button that throws when clicked — or worse, one that charges.
 *
 * The elapsed-session rule is the one that matters. Nothing else in the payment
 * path looks at the clock, so without it a client can pay full price for a
 * session whose start time has already gone by: book a 10am slot at 9am, leave
 * checkout, come back at 11am and the money still moves. The expiry window
 * doesn't prevent that — a session can easily fall inside it.
 */
export function checkoutReadiness(
  status: string,
  createdAt: Date,
  firstSessionAt: Date | null,
  now: Date = new Date(),
): { ready: boolean; reason?: string; kind?: "session_elapsed" | "window_elapsed" | "not_payable" } {
  if (status !== "pending_payment") {
    return { ready: false, reason: "This booking isn't awaiting payment.", kind: "not_payable" };
  }
  if (firstSessionAt && firstSessionAt <= now) {
    return {
      ready: false,
      kind: "session_elapsed",
      reason: "That session's start time has already passed, so it can't be paid for now.",
    };
  }
  if (paymentExpiryDeadline(createdAt) <= now) {
    return {
      ready: false,
      kind: "window_elapsed",
      reason: "This booking was held too long without payment and is being released.",
    };
  }
  return { ready: true };
}

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
