import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A compact metric tile for the dashboard stat strips. Two shapes from one
 * component:
 *  - client (1d): a tinted icon tile beside a big mono numeral + label.
 *  - advisor (9d): label on top, numeral, then an optional footnote/delta.
 * Pass `icon`+`tileClass` for the icon shape; omit them for the stacked shape.
 */
export function StatCard({
  icon: Icon,
  tileClass,
  value,
  label,
  footnote,
}: {
  icon?: LucideIcon;
  tileClass?: string;
  value: ReactNode;
  label: string;
  footnote?: ReactNode;
}) {
  if (Icon) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3.5">
          <span
            className={cn(
              "inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md",
              tileClass,
            )}
          >
            <Icon size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="ws-mono text-[24px] font-bold leading-none text-ink">{value}</p>
            <p className="mt-1.5 truncate text-sm text-gray-500">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="ws-mono mt-1.5 text-[26px] font-bold leading-none text-ink">{value}</p>
      {footnote && <div className="mt-2 text-sm text-gray-500">{footnote}</div>}
    </div>
  );
}

/** Small green "▲ 18%" style delta pill for advisor metrics. */
export function DeltaPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-pill bg-green-100 px-2 py-0.5 text-2xs font-semibold text-green-700">
      {children}
    </span>
  );
}
