import { formatMoney } from "@/lib/currency";

/**
 * Displays a stored minor-unit amount in its currency. This is the single
 * display edge for money — the multi-currency contract lives in lib/currency.
 * Amounts are monospace per the type system (amounts read in JetBrains Mono).
 */
export function Money({
  amountMinor,
  currency,
  className,
}: {
  amountMinor: number;
  currency: string;
  className?: string;
}) {
  return (
    <span className={className ? `font-mono ${className}` : "font-mono"}>
      {formatMoney(amountMinor, currency)}
    </span>
  );
}
