/**
 * Platform-level config read from env. Insurance in particular is a static
 * coverage statement at MVP (a negotiated blanket policy), NOT a live API call —
 * see 05-technical-foundation §Insurance. The InsuranceCoverageNotice component
 * reads this so a lapse is a one-line config change, never a stale hardcoded string.
 */
export const platformConfig = {
  insurance: {
    active: process.env.INSURANCE_COVERAGE_ACTIVE === "true",
    statement:
      process.env.INSURANCE_COVERAGE_STATEMENT ??
      "Every session is covered by Whetstone's professional indemnity policy.",
  },
  commissionBps: Number(process.env.PLATFORM_COMMISSION_BPS ?? 1500),
} as const;
