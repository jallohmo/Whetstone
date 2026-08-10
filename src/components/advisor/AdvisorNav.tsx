"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Inbox, ShieldCheck, UserCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Advisor sidebar nav (screens 10-14). The active row is an ink pill; inactive
 * rows are gray-700 and tint on hover. Active state is derived from the current
 * path, so this is a client component (the shell around it stays server-rendered).
 */
const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/advisor/apply", label: "Application", icon: UserCheck },
  { href: "/advisor/verification-status", label: "Verification", icon: ShieldCheck },
  { href: "/advisor/availability", label: "Availability", icon: CalendarClock },
  { href: "/advisor/bookings", label: "Bookings", icon: Inbox },
  { href: "/advisor/earnings", label: "Earnings", icon: Wallet },
];

export function AdvisorNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium transition duration-DEFAULT ease-soft",
              active
                ? "bg-ink text-white shadow-ink-glow"
                : "text-gray-700 hover:bg-gray-100",
            )}
          >
            <Icon
              size={18}
              strokeWidth={2}
              className={active ? "text-white" : "text-gray-400"}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
