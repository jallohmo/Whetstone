import {
  greeting,
  firstNameOf,
  dominantCurrency,
  countThisMonth,
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
});
