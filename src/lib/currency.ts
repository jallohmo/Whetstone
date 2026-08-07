/**
 * Multi-currency support.
 *
 * Whetstone is a global platform: prices are stored in minor units (cents) with an
 * ISO 4217 currency code alongside every monetary amount (Package, Booking, Payment).
 * AUD is the default/fallback, but any supported currency can be used end-to-end.
 *
 * Money is always stored as an integer minor-unit amount + a currency code. Never
 * store a formatted string or a float. Formatting happens at the display edge only.
 */

export const DEFAULT_CURRENCY = (
  process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "AUD"
).toUpperCase();

export interface SupportedCurrency {
  code: string; // ISO 4217
  label: string;
  /** Number of minor units per major unit (10^decimals). Most are 100; some are 1. */
  minorUnitsPerMajor: number;
}

/**
 * Currencies the platform accepts at MVP. Extend freely — display/formatting is driven
 * by Intl, so adding a code here is all that's needed for the whole app to support it.
 * Zero-decimal currencies (JPY) are handled via minorUnitsPerMajor.
 */
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "USD", label: "US Dollar", minorUnitsPerMajor: 100 },
  { code: "GBP", label: "British Pound", minorUnitsPerMajor: 100 },
  { code: "EUR", label: "Euro", minorUnitsPerMajor: 100 },
  { code: "AUD", label: "Australian Dollar", minorUnitsPerMajor: 100 },
  { code: "CAD", label: "Canadian Dollar", minorUnitsPerMajor: 100 },
  { code: "NZD", label: "New Zealand Dollar", minorUnitsPerMajor: 100 },
  { code: "SGD", label: "Singapore Dollar", minorUnitsPerMajor: 100 },
  { code: "INR", label: "Indian Rupee", minorUnitsPerMajor: 100 },
  { code: "JPY", label: "Japanese Yen", minorUnitsPerMajor: 1 },
  { code: "ZAR", label: "South African Rand", minorUnitsPerMajor: 100 },
];

const CURRENCY_INDEX = new Map(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c]),
);

export function isSupportedCurrency(code: string): boolean {
  return CURRENCY_INDEX.has(code.toUpperCase());
}

export function getCurrency(code: string): SupportedCurrency {
  return (
    CURRENCY_INDEX.get(code.toUpperCase()) ??
    CURRENCY_INDEX.get(DEFAULT_CURRENCY)!
  );
}

/**
 * Format a minor-unit amount (e.g. cents) in its currency for display.
 *
 * @example formatMoney(4900, "USD") // "$49.00"
 * @example formatMoney(4900, "GBP") // "£49.00"
 * @example formatMoney(5000, "JPY") // "¥5,000"
 */
export function formatMoney(
  amountMinor: number,
  currencyCode: string = DEFAULT_CURRENCY,
  locale?: string,
): string {
  const currency = getCurrency(currencyCode);
  const major = amountMinor / currency.minorUnitsPerMajor;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.code,
    }).format(major);
  } catch {
    // Fallback if the runtime doesn't know the currency for some reason.
    return `${currency.code} ${major.toFixed(
      currency.minorUnitsPerMajor === 1 ? 0 : 2,
    )}`;
  }
}

/** Convert a major-unit amount (what a user types) into stored minor units. */
export function toMinorUnits(
  major: number,
  currencyCode: string = DEFAULT_CURRENCY,
): number {
  const currency = getCurrency(currencyCode);
  return Math.round(major * currency.minorUnitsPerMajor);
}

/** Split a gross amount into platform commission + advisor payout (both minor units). */
export function splitCommission(
  grossMinor: number,
  commissionBps = Number(process.env.PLATFORM_COMMISSION_BPS ?? 1500),
): { platformFeeMinor: number; advisorPayoutMinor: number } {
  const platformFeeMinor = Math.round((grossMinor * commissionBps) / 10_000);
  return {
    platformFeeMinor,
    advisorPayoutMinor: grossMinor - platformFeeMinor,
  };
}
