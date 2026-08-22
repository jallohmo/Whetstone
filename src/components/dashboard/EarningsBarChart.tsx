import { formatMoney } from "@/lib/currency";
import { monthsWithEarnings } from "@/lib/dashboard";
import { cn } from "@/lib/cn";

export interface EarningsBar {
  /** Short axis label, e.g. "Sep". */
  label: string;
  /** Advisor payout for the period, in minor units of `currency`. */
  amountMinor: number;
}

/**
 * A dependency-free bar chart for the advisor earnings summary (9d). Prior
 * periods use a lighter blue gradient; the current (last) period uses the deeper
 * brand gradient with its value floated above. Heights are scaled to the largest
 * bar.
 *
 * The row must NOT set `items-end`. Bar heights are percentages, and a
 * percentage height resolves against the containing block — so a column that
 * has not been stretched to the row's height is `auto`, the percentage computes
 * to `auto`, and every bar collapses to nothing. That is exactly what happened:
 * the card rendered its month labels and the current-month figure with a blank
 * space where the bars should be. Default `stretch` gives each column the full
 * 150px; `justify-end` inside still pins the bar to the baseline.
 *
 * Single-currency by design — the caller aggregates the advisor's dominant
 * currency; the authoritative per-currency breakdown lives on the Earnings page.
 */
export function EarningsBarChart({
  data,
  currency,
}: {
  data: EarningsBar[];
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.amountMinor), 1);
  const earning = monthsWithEarnings(data);

  // One bar next to six empty slots reads as a broken chart rather than as a
  // new advisor, so below two points say it in words. Same 150px box either
  // way, so the card doesn't change size as history builds up.
  if (earning < 2) {
    return (
      <div className="flex h-[150px] flex-col items-center justify-center px-4 text-center">
        <p className="text-body font-semibold text-ink">
          {earning === 0 ? "No earnings yet" : "Not enough history to chart"}
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {earning === 0
            ? "Your first payout appears here once a session is complete."
            : "Once you've earned across two or more months, this becomes a chart."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-[150px] gap-3">
        {data.map((d, i) => {
          const last = i === data.length - 1;
          // Floor at 4% so a non-zero period is always visible; a true zero stays flat.
          const pct = d.amountMinor === 0 ? 2 : Math.max(4, Math.round((d.amountMinor / max) * 100));
          return (
            <div key={d.label} className="relative flex flex-1 flex-col items-center justify-end">
              {last && d.amountMinor > 0 && (
                <span className="ws-mono mb-1.5 text-2xs font-semibold text-ink">
                  {formatMoney(d.amountMinor, currency)}
                </span>
              )}
              <div
                className="w-full rounded-t-lg"
                style={{
                  height: `${pct}%`,
                  background: last
                    ? "linear-gradient(180deg,#2e45ff,#1a26b8)"
                    : "linear-gradient(180deg,#8fa2ff,#2e45ff)",
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3">
        {data.map((d, i) => (
          <span
            key={d.label}
            className={cn(
              "flex-1 text-center text-2xs",
              i === data.length - 1 ? "font-semibold text-ink" : "text-gray-500",
            )}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
