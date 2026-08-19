import {
  BOOKING_STATUSES,
  LIVE_BOOKING_STATUSES,
  IN_DELIVERY_BOOKING_STATUSES,
  PAID_BOOKING_STATUSES,
  COMPLETABLE_BOOKING_STATUSES,
  CUSTOMER_STATUS_LABEL,
  ADVISOR_STATUS_LABEL,
  COMPLETION_REMINDER_DAYS,
  COMPLETION_AUTO_ACCEPT_DAYS,
  PAYMENT_REMINDER_HOURS,
  PAYMENT_EXPIRY_HOURS,
  completionReadiness,
  autoAcceptDeadline,
  paymentExpiryDeadline,
  isResumedCheckout,
  checkoutReadiness,
  CHECKOUT_RESUME_AFTER_MINUTES,
} from "@/lib/booking-status";

/**
 * Booking.status is a plain string column, so nothing at the type level stops a
 * screen from filtering on a stale list and silently dropping bookings out of
 * someone's dashboard — which is exactly what adding "awaiting_confirmation"
 * would have done to six queries. These tests pin the groupings and the
 * completion guard that the UI and the server action share.
 */

const DAY = 86_400_000;
const past = (days: number) => new Date(Date.now() - days * DAY);
const future = (days: number) => new Date(Date.now() + days * DAY);

describe("status groupings", () => {
  it("only ever contains known statuses", () => {
    for (const group of [
      LIVE_BOOKING_STATUSES,
      IN_DELIVERY_BOOKING_STATUSES,
      PAID_BOOKING_STATUSES,
      COMPLETABLE_BOOKING_STATUSES,
    ]) {
      for (const s of group) expect(BOOKING_STATUSES).toContain(s);
    }
  });

  it("treats awaiting_confirmation as live — the booking still needs something", () => {
    expect(LIVE_BOOKING_STATUSES).toContain("awaiting_confirmation");
  });

  it("excludes awaiting_confirmation from delivery, so no session reminders fire", () => {
    expect(IN_DELIVERY_BOOKING_STATUSES).not.toContain("awaiting_confirmation");
  });

  it("counts awaiting_confirmation as paid — the money was taken and not refunded", () => {
    expect(PAID_BOOKING_STATUSES).toContain("awaiting_confirmation");
    expect(PAID_BOOKING_STATUSES).not.toContain("cancelled");
  });

  it("never lets a booking be marked complete twice", () => {
    expect(COMPLETABLE_BOOKING_STATUSES).not.toContain("awaiting_confirmation");
    expect(COMPLETABLE_BOOKING_STATUSES).not.toContain("completed");
  });

  it("labels every status for both audiences, so no raw enum leaks into the UI", () => {
    for (const s of BOOKING_STATUSES) {
      expect(CUSTOMER_STATUS_LABEL[s]).toBeTruthy();
      expect(ADVISOR_STATUS_LABEL[s]).toBeTruthy();
    }
  });

  it("words awaiting_confirmation from each side's point of view", () => {
    expect(CUSTOMER_STATUS_LABEL.awaiting_confirmation).not.toEqual(
      ADVISOR_STATUS_LABEL.awaiting_confirmation,
    );
  });
});

describe("completionReadiness", () => {
  const done = (days: number) => ({ status: "completed", scheduledAt: past(days) });
  const noShow = (days: number) => ({ status: "no_show", scheduledAt: past(days) });
  const scheduled = (d: Date) => ({ status: "scheduled", scheduledAt: d });

  it("allows completion once every session has an outcome", () => {
    expect(completionReadiness("in_progress", [done(2)])).toEqual({ ready: true });
    expect(completionReadiness("confirmed", [done(5), noShow(2)])).toEqual({ ready: true });
  });

  it("blocks a multi-session package until ALL sessions are recorded", () => {
    // The gap that let a 3-session booking be closed, and paid out, after one.
    const r = completionReadiness("in_progress", [done(9), done(2), scheduled(past(1))]);
    expect(r.ready).toBe(false);
    expect(r.reason).toContain("1 of 3");
  });

  it("explains itself differently before the first session has happened", () => {
    const r = completionReadiness("confirmed", [scheduled(future(3))]);
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/first session/i);
  });

  it("refuses a second mark-complete on a booking already with the client", () => {
    const r = completionReadiness("awaiting_confirmation", [done(1)]);
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/already/i);
  });

  it.each(["pending_payment", "completed", "cancelled", "disputed"])(
    "refuses from %s",
    (status) => {
      expect(completionReadiness(status, [done(1)]).ready).toBe(false);
    },
  );

  it("refuses a booking with no sessions rather than silently completing it", () => {
    expect(completionReadiness("confirmed", []).ready).toBe(false);
  });

  it("always gives a reason when it says no — the UI renders it verbatim", () => {
    const cases = [
      completionReadiness("awaiting_confirmation", [done(1)]),
      completionReadiness("cancelled", [done(1)]),
      completionReadiness("confirmed", []),
      completionReadiness("confirmed", [scheduled(future(1))]),
      completionReadiness("in_progress", [scheduled(past(1))]),
    ];
    for (const c of cases) {
      expect(c.ready).toBe(false);
      expect(c.reason).toBeTruthy();
    }
  });
});

describe("auto-accept window", () => {
  it("nudges before it auto-accepts", () => {
    expect(COMPLETION_REMINDER_DAYS).toBeLessThan(COMPLETION_AUTO_ACCEPT_DAYS);
  });

  it("puts the deadline the configured number of days after the advisor marked it", () => {
    const marked = new Date("2026-03-01T00:00:00.000Z");
    expect(autoAcceptDeadline(marked).toISOString()).toBe("2026-03-08T00:00:00.000Z");
  });
});


/**
 * The unpaid-booking windows. An abandoned checkout holds the advisor's
 * availability slot until the sweep cancels it, so the ordering below is the
 * whole safety property: the client must be nudged, and given time to act on the
 * nudge, before anything is cancelled underneath them.
 */
describe("pending-payment windows", () => {
  it("nudges well before it expires", () => {
    expect(PAYMENT_REMINDER_HOURS).toBeLessThan(PAYMENT_EXPIRY_HOURS);
  });

  it("leaves the client time to act on the reminder", () => {
    expect(PAYMENT_EXPIRY_HOURS - PAYMENT_REMINDER_HOURS).toBeGreaterThanOrEqual(12);
  });

  it("counts the expiry deadline from when the booking was created", () => {
    const createdAt = new Date("2026-03-01T09:00:00.000Z");
    expect(paymentExpiryDeadline(createdAt).toISOString()).toBe("2026-03-02T09:00:00.000Z");
  });

  it("never treats an unpaid booking as paid", () => {
    expect(PAID_BOOKING_STATUSES).not.toContain("pending_payment");
    expect(LIVE_BOOKING_STATUSES).not.toContain("pending_payment");
  });

  it("labels the unpaid state for the client", () => {
    expect(CUSTOMER_STATUS_LABEL.pending_payment).toBe("Awaiting payment");
  });
});


const MIN = 60_000;
const HOUR = 3_600_000;

/**
 * The checkout gate. checkoutReadiness is the last thing standing between a
 * client and a charge for a session that has already happened, and it is shared
 * by the screen and the server action — so these pin the refusals rather than
 * the happy path.
 */
describe("checkoutReadiness", () => {
  const now = new Date("2026-03-02T09:00:00.000Z");
  const justCreated = new Date(now.getTime() - 5 * MIN);
  const soon = new Date(now.getTime() + 2 * HOUR);

  it("lets a fresh booking with a future session through", () => {
    expect(checkoutReadiness("pending_payment", justCreated, soon, now)).toEqual({ ready: true });
  });

  it("allows payment when no session is scheduled yet", () => {
    expect(checkoutReadiness("pending_payment", justCreated, null, now)).toEqual({ ready: true });
  });

  it("refuses once the session's start time has passed", () => {
    const elapsed = new Date(now.getTime() - MIN);
    const r = checkoutReadiness("pending_payment", justCreated, elapsed, now);
    expect(r.ready).toBe(false);
    expect(r.kind).toBe("session_elapsed");
  });

  it("refuses at the exact moment the session starts", () => {
    const r = checkoutReadiness("pending_payment", justCreated, now, now);
    expect(r.ready).toBe(false);
    expect(r.kind).toBe("session_elapsed");
  });

  it("refuses a booking past its expiry window, even with a future session", () => {
    const stale = new Date(now.getTime() - (PAYMENT_EXPIRY_HOURS + 1) * HOUR);
    const r = checkoutReadiness("pending_payment", stale, soon, now);
    expect(r.ready).toBe(false);
    expect(r.kind).toBe("window_elapsed");
  });

  it("reports an elapsed session ahead of an elapsed window", () => {
    // Both are true here; the session is the more specific thing to tell them.
    const stale = new Date(now.getTime() - (PAYMENT_EXPIRY_HOURS + 1) * HOUR);
    const elapsed = new Date(now.getTime() - MIN);
    expect(checkoutReadiness("pending_payment", stale, elapsed, now).kind).toBe("session_elapsed");
  });

  it("refuses anything that isn't awaiting payment", () => {
    for (const status of ["confirmed", "in_progress", "completed", "cancelled"]) {
      const r = checkoutReadiness(status, justCreated, soon, now);
      expect(r.ready).toBe(false);
      expect(r.kind).toBe("not_payable");
    }
  });

  it("always explains itself when it refuses", () => {
    const stale = new Date(now.getTime() - (PAYMENT_EXPIRY_HOURS + 1) * HOUR);
    for (const r of [
      checkoutReadiness("confirmed", justCreated, soon, now),
      checkoutReadiness("pending_payment", justCreated, new Date(now.getTime() - MIN), now),
      checkoutReadiness("pending_payment", stale, soon, now),
    ]) {
      expect(r.reason).toBeTruthy();
    }
  });
});

describe("isResumedCheckout", () => {
  const now = new Date("2026-03-02T09:00:00.000Z");

  it("treats the booking funnel as not resumed", () => {
    expect(isResumedCheckout(new Date(now.getTime() - 10_000), now)).toBe(false);
  });

  it("treats a return from the reminder email as resumed", () => {
    expect(isResumedCheckout(new Date(now.getTime() - PAYMENT_REMINDER_HOURS * HOUR), now)).toBe(true);
  });

  it("flips at the threshold", () => {
    const at = new Date(now.getTime() - CHECKOUT_RESUME_AFTER_MINUTES * MIN);
    const justBefore = new Date(at.getTime() + 1_000);
    expect(isResumedCheckout(at, now)).toBe(true);
    expect(isResumedCheckout(justBefore, now)).toBe(false);
  });

  it("resumes well before the reminder goes out, so that email never lands on the funnel view", () => {
    expect(CHECKOUT_RESUME_AFTER_MINUTES * MIN).toBeLessThan(PAYMENT_REMINDER_HOURS * HOUR);
  });
});
