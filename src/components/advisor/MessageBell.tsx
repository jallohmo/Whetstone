import Link from "next/link";
import { Bell } from "lucide-react";
import { badgeLabel, bellLabel } from "@/lib/unread";

/**
 * Unread-message bell for the advisor header.
 *
 * Server component: the count is resolved when the page renders, so it is
 * accurate as of the last navigation and goes stale until the next one. That is
 * a deliberate trade — advisory sessions are not a chat app, and a live
 * subscription would be the only pattern of its kind in this codebase.
 *
 * Renders the bell at zero as well, without a badge. A control that appears and
 * disappears is harder to find than one that is always in the same place.
 */
export function MessageBell({ count, href = "/advisor/messages" }: { count: number; href?: string }) {
  const badge = badgeLabel(count);

  return (
    <Link
      href={href}
      aria-label={bellLabel(count)}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-pill border border-gray-200 bg-white text-ink transition hover:-translate-y-px hover:shadow-float"
    >
      <Bell size={18} strokeWidth={2} />
      {badge && (
        <span
          // aria-hidden: the count is already in the link's accessible name, so
          // announcing it twice just makes the control noisier to listen to.
          aria-hidden
          className="absolute -right-1 -top-1 inline-flex min-w-[20px] items-center justify-center rounded-pill bg-brand-blue px-1.5 py-0.5 text-2xs font-bold leading-none text-white ring-2 ring-gray-50"
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
