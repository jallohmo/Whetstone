import { splitCommission, DEFAULT_CURRENCY } from "@/lib/currency";
import type { EarningsBar } from "@/components/dashboard/EarningsBarChart";

/**
 * Pure helpers shared by the two signed-in home dashboards (client 1d /
 * advisor 9d). No I/O — the pages do their own prisma queries and hand the rows
 * in here so the numbers reconcile with the detail screens (13 bookings, 14
 * earnings) rather than being recomputed divergently.
 */

/** Time-of-day greeting. Server time (UTC) — close enough for a hello. */
export function greeting(date = new Date()): string {
  const h = date.getUTCHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** First token of a display name, for a personal greeting. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * The currency most of these rows are in. Dashboards summarise a single currency
 * (never sum across them); the per-currency truth lives on the detail screens.
 */
export function dominantCurrency<T extends { currency: string }>(rows: T[]): string {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
  let best = DEFAULT_CURRENCY;
  let bestN = -1;
  for (const [ccy, n] of counts) {
    if (n > bestN) {
      best = ccy;
      bestN = n;
    }
  }
  return best;
}

/**
 * Payment statuses that mean the client's money actually left their account and
 * has not come back. "held" counts: this platform charges up front and holds the
 * funds in escrow, so from the client's side a held payment is already spent —
 * their statement says so — whether or not the session has happened yet.
 * "refunded" does not count, which is the whole reason this list exists.
 */
export const SPENT_PAYMENT_STATUSES = ["held", "released"] as const;

export interface SpendRow {
  amountCents: number;
  currency: string;
  /** Sessions the booking was sold as, NOT session rows scheduled so far. */
  sessionCount: number;
}

export interface SpendSummary {
  currency: string;
  totalMinor: number;
  sessions: number;
}

/**
 * The client's "this year" spend card: one figure and the session count that
 * belongs to it.
 *
 * Both numbers come from the SAME rows, and that is the point. They used to be
 * computed apart — the money from Payment rows, the count from
 * `past.length + upcoming.length` off the two dashboard list loaders — so the
 * card could say "$120 across 2 sessions" while one of those sessions belonged
 * to a cancelled booking that was never paid for. Anything that isn't in the
 * total must not be in the count.
 *
 * Counting `sessionCount` rather than Session rows also keeps a 3-session
 * package reading as 3 from the moment it is paid for, instead of climbing from
 * 1 as the later sessions get scheduled by coordination.
 *
 * Currency: dashboards summarise one currency and never sum across them, so
 * rows outside the dominant one are dropped from BOTH halves together.
 */
export function summariseSpend(rows: SpendRow[]): SpendSummary {
  if (rows.length === 0) {
    return { currency: DEFAULT_CURRENCY, totalMinor: 0, sessions: 0 };
  }
  const currency = dominantCurrency(rows);
  const inCcy = rows.filter((r) => r.currency === currency);
  return {
    currency,
    totalMinor: inCcy.reduce((sum, r) => sum + r.amountCents, 0),
    sessions: inCcy.reduce((sum, r) => sum + r.sessionCount, 0),
  };
}

/** Short month label, e.g. "Sep". */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface PaymentRow {
  amountCents: number;
  currency: string;
  status: string;
  /** When the money moved — we use the booking's createdAt (Payment has none). */
  at: Date;
}

export interface EarningsSummary {
  currency: string;
  series: EarningsBar[];
  /** Sum of advisor payouts across the visible window (dominant currency). */
  totalMinor: number;
  /** Advisor payout for the current month. */
  thisMonthMinor: number;
  /** Held (not-yet-released) payout still coming to the advisor. */
  comingMinor: number;
  /** Whole-percent change of the last month vs the previous, or null if n/a. */
  momPct: number | null;
}

/**
 * Bucket advisor payouts into the last `months` calendar months for the chart,
 * plus the running totals. Filters to the dominant currency so bars never mix
 * currencies. `advisorPayoutMinor` is derived with the same commission split as
 * the Earnings page.
 */
export function buildEarningsSummary(rows: PaymentRow[], months = 7, now = new Date()): EarningsSummary {
  const currency = dominantCurrency(rows.length ? rows : [{ currency: DEFAULT_CURRENCY } as PaymentRow]);
  const inCcy = rows.filter((r) => r.currency === currency);

  // Build month buckets from oldest -> current.
  const buckets: { key: string; label: string; amountMinor: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({
      key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`,
      label: MONTHS[d.getUTCMonth()],
      amountMinor: 0,
    });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));

  let comingMinor = 0;
  for (const r of inCcy) {
    const payout = splitCommission(r.amountCents).advisorPayoutMinor;
    if (r.status === "held") comingMinor += payout;
    const key = `${r.at.getUTCFullYear()}-${r.at.getUTCMonth()}`;
    const idx = index.get(key);
    if (idx != null) buckets[idx].amountMinor += payout;
  }

  const series: EarningsBar[] = buckets.map((b) => ({ label: b.label, amountMinor: b.amountMinor }));
  const totalMinor = series.reduce((s, b) => s + b.amountMinor, 0);
  const thisMonthMinor = series[series.length - 1]?.amountMinor ?? 0;
  const prevMonthMinor = series[series.length - 2]?.amountMinor ?? 0;
  const momPct =
    prevMonthMinor > 0 ? Math.round(((thisMonthMinor - prevMonthMinor) / prevMonthMinor) * 100) : null;

  return { currency, series, totalMinor, thisMonthMinor, comingMinor, momPct };
}

/** Count of payment rows whose booking was created in the current month. */
export function countThisMonth(rows: { at: Date }[], now = new Date()): number {
  return rows.filter(
    (r) => r.at.getUTCFullYear() === now.getUTCFullYear() && r.at.getUTCMonth() === now.getUTCMonth(),
  ).length;
}
