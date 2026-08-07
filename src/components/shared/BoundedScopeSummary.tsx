import { CheckCircle2 } from "lucide-react";
import { Money } from "./Money";

/**
 * Used at booking, checkout, and confirmation. Renders session count + defined
 * scope in one unmistakable format everywhere a booking is shown. Bounded scope
 * is a liability/trust design decision, not a pricing detail — make it obvious.
 */
export function BoundedScopeSummary({
  sessionCount,
  scopeDescription,
  priceCents,
  currency,
}: {
  sessionCount: number;
  scopeDescription: string;
  priceCents?: number;
  currency?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          What&apos;s included
        </span>
        {typeof priceCents === "number" && currency && (
          <Money amountMinor={priceCents} currency={currency} className="text-h3 text-ink" />
        )}
      </div>
      <p className="mt-3 flex items-center gap-2 text-body font-semibold text-ink">
        <CheckCircle2 size={18} className="text-green-500" />
        {sessionCount} {sessionCount === 1 ? "session" : "sessions"}, fixed scope
      </p>
      <p className="mt-2 text-body text-gray-600">{scopeDescription}</p>
      <p className="mt-3 border-t border-dashed border-gray-300 pt-3 text-sm text-gray-500">
        Bounded engagement. No open-ended hours — you know exactly what you&apos;re booking.
      </p>
    </div>
  );
}
