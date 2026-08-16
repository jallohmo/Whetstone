import {
  formatMoney,
  toMinorUnits,
  splitCommission,
  isSupportedCurrency,
  getCurrency,
  DEFAULT_CURRENCY,
} from "@/lib/currency";

/**
 * Money handling. Amounts are stored as integer minor units alongside an ISO 4217
 * code, so the rounding and zero-decimal behaviour here is what keeps a payout
 * reconciling with the amount the client was charged.
 */
describe("currency", () => {
  it("defaults to AUD", () => {
    expect(DEFAULT_CURRENCY).toBe("AUD");
  });

  describe("formatMoney", () => {
    it("renders minor units as major-unit currency", () => {
      // Non-breaking spaces and symbol placement vary by ICU build, so assert on
      // the parts that matter rather than an exact string.
      const out = formatMoney(49_00, "AUD", "en-AU");
      expect(out).toContain("49.00");
      expect(out).toMatch(/\$/);
    });

    it("handles zero-decimal currencies without inventing cents", () => {
      const out = formatMoney(5000, "JPY", "en-US");
      expect(out).toContain("5,000");
      expect(out).not.toContain("5,000.00");
    });

    it("formats zero rather than rendering an empty string", () => {
      expect(formatMoney(0, "AUD", "en-AU")).toContain("0.00");
    });
  });

  describe("toMinorUnits", () => {
    it("converts major units to integer minor units", () => {
      expect(toMinorUnits(49, "AUD")).toBe(4900);
      expect(toMinorUnits(49.99, "AUD")).toBe(4999);
    });

    it("rounds rather than truncating, so a cent is never silently lost", () => {
      expect(toMinorUnits(0.005, "AUD")).toBe(1);
    });

    it("respects zero-decimal currencies", () => {
      expect(toMinorUnits(5000, "JPY")).toBe(5000);
    });
  });

  describe("splitCommission", () => {
    it("splits gross into platform fee and advisor payout at the default 15%", () => {
      const { platformFeeMinor, advisorPayoutMinor } = splitCommission(100_00, 1500);
      expect(platformFeeMinor).toBe(1500);
      expect(advisorPayoutMinor).toBe(8500);
    });

    it("always sums back to the gross — no cent is created or destroyed", () => {
      for (const gross of [1, 99, 333, 4999, 100_00, 123_45]) {
        const { platformFeeMinor, advisorPayoutMinor } = splitCommission(gross, 1500);
        expect(platformFeeMinor + advisorPayoutMinor).toBe(gross);
      }
    });

    it("handles a zero commission", () => {
      expect(splitCommission(4900, 0)).toEqual({
        platformFeeMinor: 0,
        advisorPayoutMinor: 4900,
      });
    });

    it("returns integers, never fractional minor units", () => {
      const { platformFeeMinor, advisorPayoutMinor } = splitCommission(333, 1500);
      expect(Number.isInteger(platformFeeMinor)).toBe(true);
      expect(Number.isInteger(advisorPayoutMinor)).toBe(true);
    });
  });

  describe("currency lookup", () => {
    it("recognises supported codes", () => {
      expect(isSupportedCurrency("AUD")).toBe(true);
      expect(isSupportedCurrency("ZZZ")).toBe(false);
    });

    it("falls back to the default for an unknown code instead of throwing", () => {
      expect(getCurrency("ZZZ").code).toBe(DEFAULT_CURRENCY);
    });
  });
});
