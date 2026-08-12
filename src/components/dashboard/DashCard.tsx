import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * A titled dashboard card with an optional right-aligned "View all" / "Open"
 * link. Used across both signed-in home dashboards (1d / 9d) so the section
 * chrome reads identically everywhere. Body is whatever the caller passes.
 */
export function DashCard({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: { label: string; href: string };
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn(className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-h3 text-ink">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 text-sm font-semibold text-brand-blue transition hover:underline"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}
