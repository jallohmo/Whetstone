import {
  greeting,
  firstNameOf,
  dominantCurrency,
  countThisMonth,
  summariseSpend,
  SPENT_PAYMENT_STATUSES,
  monthsWithEarnings,
  payoutRowDate,
} from "@/lib/dashboard";
import { DEFAULT_CURRENCY } from "@/lib/currency";

/**
 * Pure dashboard helpers. Both signed-in homes share these so the headline
 * numbers reconcile with the detail screens rather than being recomputed.
 * Every function takes an explicit `now`, which is what makes them testable
 * without freezing the clock.
 */
describe("dashboard helpers", () => {
  describe("greeting", () => {
    it.each([
      ["00:00", 0, "Good morning"],
      ["08:30", 8, "Good morning"],
      ["11:59", 11, "Good morning"],
      ["12:00", 12, "Good afternoon"],
      ["17:59", 17, "Good afternoon"],
      ["18:00", 18, "Good evening"],
      ["23:59", 23, "Good evening"],
    ])("at %s UTC says %s", (_label, hour, expected) => {
      expect(greeting(new Date(Date.UTC(2026, 0, 15, hour, 0, 0)))).toBe(expected);
    });
  });

  describe("firstNameOf", () => {
    it("takes the first token", () => {
      expect(firstNameOf("Mo Jalloh")).toBe("Mo");
      expect(firstNameOf("Ada")).toBe("Ada");
    });

    it("copes with padding and repeated spaces", () => {
      expect(firstNameOf("  Mo   Jalloh  ")).toBe("Mo");
    });

    it("returns the input rather than an empty greeting when there is no name", () => {
      expect(firstNameOf("")).toBe("");
    });
  });

  describe("dominantCurrency", () => {
    it("picks the most common currency", () => {
      const rows = [
        { currency: "AUD" },
        { currency: "GBP" },
        { currency: "GBP" },
      ];
      expect(dominantCurrency(rows)).toBe("GBP");
    });

    it("falls back to the default for an empty set", () => {
      expect(dominantCurrency([])).toBe(DEFAULT_CURRENCY);
    });

    it("returns the only currency present", () => {
      expect(dominantCurrency([{ currency: "USD" }])).toBe("USD");
    });
  });

  describe("countThisMonth", () => {
    const now = new Date(Date.UTC(2026, 7, 16));

    it("counts only rows inside the current calendar month", () => {
      const rows = [
        { at: new Date(Date.UTC(2026, 7, 1)) },
        { at: new Date(Date.UTC(2026, 7, 31)) },
        { at: new Date(Date.UTC(2026, 6, 31)) },
        { at: new Date(Date.UTC(2026, 8, 1)) },
      ];
      expect(countThisMonth(rows, now)).toBe(2);
    });

    it("does not count the same month in a different year", () => {
      expect(countThisMonth([{ at: new Date(Date.UTC(2025, 7, 16)) }], now)).toBe(0);
    });

    it("returns zero for no rows", () => {
      expect(countThisMonth([], now)).toBe(0);
    });
  });

  /**
   * The client's "this year" card. Its two halves used to come from different
   * queries — money from Payment rows, sessions from the lengths of the two
   * capped dashboard list loaders — so it could report a session it had not
   * charged for. These pin the property that matters: whatever is not in the
   * total is not in the count.
   */
  describe("summariseSpend", () => {
    const aud = (amountCents: number, sessionCount = 1) => ({
      amountCents,
      currency: "AUD",
      sessionCount,
    });

    it("counts a paid upcoming session as spent — the money already left", () => {
      // One past, one upcoming, both paid up front and held in escrow.
      const s = summariseSpend([aud(12000), aud(12000)]);
      expect(s.totalMinor).toBe(24000);
      expect(s.sessions).toBe(2);
    });

    it("returns a zeroed summary with no rows", () => {
      const s = summariseSpend([]);
      expect(s).toEqual({ currency: DEFAULT_CURRENCY, totalMinor: 0, sessions: 0 });
    });

    it("counts the sessions a booking was sold as, not the ones scheduled so far", () => {
      // A 3-session package reads as 3 the moment it is paid for, rather than
      // climbing from 1 as the later sessions get scheduled by coordination.
      expect(summariseSpend([aud(30000, 3)]).sessions).toBe(3);
    });

    it("never counts a session whose money is excluded by currency", () => {
      const s = summariseSpend([aud(12000), aud(12000), { amountCents: 9900, currency: "USD", sessionCount: 5 }]);
      expect(s.currency).toBe("AUD");
      expect(s.totalMinor).toBe(24000);
      expect(s.sessions).toBe(2);
    });

    it("keeps the count consistent with the total for any input", () => {
      // The invariant the split queries could not hold: sessions are zero
      // exactly when the total is, because both come off the same rows.
      for (const rows of [[], [aud(0, 0)], [aud(12000)], [aud(12000, 2), aud(500, 1)]]) {
        const s = summariseSpend(rows);
        expect(s.sessions === 0).toBe(s.totalMinor === 0);
      }
    });
  });

  describe("SPENT_PAYMENT_STATUSES", () => {
    it("counts money held in escrow — the client has already paid", () => {
      expect(SPENT_PAYMENT_STATUSES).toContain("held");
    });

    it("counts money released to the advisor", () => {
      expect(SPENT_PAYMENT_STATUSES).toContain("released");
    });

    it("does not count a refund as spend", () => {
      expect(SPENT_PAYMENT_STATUSES).not.toContain("refunded");
    });
  });

  /**
   * Whether the earnings card has enough to draw. One bar beside six empty
   * slots reads as a broken chart, not as a new advisor.
   */
  describe("monthsWithEarnings", () => {
    const m = (...amounts: number[]) => amounts.map((amountMinor) => ({ amountMinor }));

    it("counts only months that earned something", () => {
      expect(monthsWithEarnings(m(0, 0, 12000, 0, 30600))).toBe(2);
    });

    it("is zero for a brand-new advisor", () => {
      expect(monthsWithEarnings(m(0, 0, 0, 0, 0, 0, 0))).toBe(0);
    });

    it("is zero for an empty series", () => {
      expect(monthsWithEarnings([])).toBe(0);
    });

    it("reports one for a single earning month — the case that looked broken", () => {
      // A$306 in August and nothing else: the state that rendered a blank box
      // with a figure floating in it.
      expect(monthsWithEarnings(m(0, 0, 0, 0, 0, 0, 30600))).toBe(1);
    });

    it("does not count a negative amount as earnings", () => {
      expect(monthsWithEarnings(m(-100, 12000))).toBe(1);
    });
  });

  /**
   * Which date an earnings row is filed under. The advisor is reconciling
   * against a bank statement, so the question is "when did I do the work",
   * not "when was this booked" — and those can sit weeks apart.
   */
  describe("payoutRowDate", () => {
    const booked = new Date("2026-08-01T00:00:00.000Z");
    const session = new Date("2026-08-20T09:00:00.000Z");

    it("files a row under its session, not its booking", () => {
      expect(payoutRowDate(session, booked)).toEqual(session);
    });

    it("falls back to the booking date when no session is scheduled", () => {
      // Not the epoch, and not dropped — an unscheduled booking still has to
      // sort somewhere sensible.
      expect(payoutRowDate(null, booked)).toEqual(booked);
    });

    it("keeps an unscheduled booking in the same timeline as the rest", () => {
      const rows = [
        { at: payoutRowDate(null, booked) },
        { at: payoutRowDate(session, new Date("2026-07-01T00:00:00.000Z")) },
      ].sort((a, b) => b.at.getTime() - a.at.getTime());
      // The August session outranks the August booking, and both stay ordered.
      expect(rows[0].at).toEqual(session);
    });

    it("uses the session even when it precedes the booking date", () => {
      // Defensive: nothing stops a backdated session, and the rule is still
      // "the session is the answer".
      const past = new Date("2026-07-01T00:00:00.000Z");
      expect(payoutRowDate(past, booked)).toEqual(past);
    });
  });
});