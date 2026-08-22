"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Inbox, LayoutDashboard, LifeBuoy, MessagesSquare, Settings, ShieldCheck, UserCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Advisor sidebar nav (screens 10-14). The active row is an ink pill; inactive
 * rows are gray-700 and tint on hover. Active state is derived from the current
 * path, so this is a client component (the shell around it stays server-rendered).
 *
 * `external` items (Help & Support) open a normal anchor, not a Next route.
 */
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

const NAV: NavItem[] = [
  { href: "/advisor", label: "Home", icon: LayoutDashboard },
  { href: "/advisor/account", label: "Account Settings", icon: Settings },
  { href: "/advisor/apply", label: "Application", icon: UserCheck },
  { href: "/advisor/verification-status", label: "Verification", icon: ShieldCheck },
  { href: "/advisor/availability", label: "Availability", icon: CalendarClock },
  { href: "/advisor/bookings", label: "Bookings", icon: Inbox },
  { href: "/advisor/messages", label: "Messages", icon: MessagesSquare },
  { href: "/advisor/earnings", label: "Earnings", icon: Wallet },
  { href: "https://help.whetstone.au", label: "Help & Support", icon: LifeBuoy, external: true },
];

export function AdvisorNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon, external }) => {
        // "/advisor" (Home) matches only exactly — it's a prefix of every other
        // route, so it must not light up on the sub-pages.
        const active =
          !external && (pathname === href || (href !== "/advisor" && pathname.startsWith(href + "/")));
        const className = cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 text-body font-medium transition duration-DEFAULT ease-soft",
          active ? "bg-ink text-white shadow-ink-glow" : "text-gray-700 hover:bg-gray-100",
        );
        const icon = (
          <Icon size={18} strokeWidth={2} className={active ? "text-white" : "text-gray-400"} />
        );

        return external ? (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {icon}
            {label}
          </a>
        ) : (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={className}>
            {icon}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
