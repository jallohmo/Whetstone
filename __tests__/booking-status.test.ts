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
  completionReadiness,
  autoAcceptDeadline,
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
