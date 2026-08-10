"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  LifeBuoy,
  LogOut,
  Settings,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Role-aware profile popover (screens 9b / 14b). One component, two placements:
 *   - customer: a pill avatar+caret chip in the top bar, menu opens downward.
 *   - advisor: the sidebar identity chip, menu opens upward, chip goes ink-active.
 * Closes on outside-click / Esc; Sign out lives in the footer (red).
 */
export function ProfileMenu({
  role,
  displayName,
  email,
  avatarUrl,
  verified = false,
  publicProfileId,
}: {
  role: "customer" | "advisor";
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  verified?: boolean;
  publicProfileId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  const items: MenuItem[] =
    role === "advisor"
      ? [
          {
            label: "View public profile",
            href: verified && publicProfileId ? `/advisors/${publicProfileId}` : "/advisor/verification-status",
            icon: UserIcon,
          },
          { label: "Account settings", href: "/advisor/account", icon: Settings },
          { label: "Payout details", href: "/advisor/account#payouts", icon: Wallet },
          { label: "Availability", href: "/advisor/availability", icon: CalendarClock },
          { label: "Help & support", href: "/#how-it-works", icon: LifeBuoy },
        ]
      : [
          { label: "View profile", href: "/account", icon: UserIcon },
          { label: "Account settings", href: "/account", icon: Settings },
          { label: "Payment methods", href: "/account#payments", icon: CreditCard },
          { label: "Notifications", href: "/account#notifications", icon: Bell },
          { label: "Help & support", href: "/#how-it-works", icon: LifeBuoy },
        ];

  const advisorActive = role === "advisor" && (open || pathname.startsWith("/advisor/account"));

  return (
    <div ref={ref} className={cn("relative", role === "customer" && "flex")}>
      {/* Trigger */}
      {role === "customer" ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 rounded-pill border border-gray-200 py-1 pl-1 pr-2 transition duration-DEFAULT ease-soft hover:border-gray-300"
        >
          <Avatar name={displayName} src={avatarUrl} size={32} />
          <ChevronDown size={16} className="text-gray-500" strokeWidth={2} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-3 rounded-md p-1.5 text-left transition duration-DEFAULT ease-soft",
            advisorActive ? "bg-ink text-white" : "hover:bg-gray-100",
          )}
        >
          <Avatar name={displayName} src={avatarUrl} gradient="brand" size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className={cn("truncate text-xs", advisorActive ? "text-white/60" : "text-gray-500")}>
              Advisor
            </p>
          </div>
          <ChevronUp size={16} strokeWidth={2} className={advisorActive ? "text-white/70" : "text-gray-400"} />
        </button>
      )}

      {/* Popover */}
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute z-50 w-[260px] rounded-lg border border-gray-200 bg-white p-2",
            role === "customer"
              ? "right-0 top-[calc(100%+8px)] shadow-[0_12px_34px_rgba(17,17,20,.16)]"
              : "bottom-[calc(100%+8px)] left-0 shadow-[0_-8px_34px_rgba(17,17,20,.16)]",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-gray-150 px-2 pb-3 pt-1">
            <Avatar name={displayName} src={avatarUrl} gradient={role === "advisor" ? "brand" : undefined} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              {role === "advisor" && verified ? (
                <span className="mt-0.5 inline-flex items-center gap-1 rounded-pill bg-green-100 px-2 py-0.5 text-2xs font-semibold text-green-700">
                  <BadgeCheck size={12} strokeWidth={2} /> Verified
                </span>
              ) : (
                <p className="truncate text-xs text-gray-500">{email}</p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="flex flex-col py-1">
            {items.map((it) => (
              <Link
                key={it.label}
                href={it.href}
                role="menuitem"
                className="flex items-center gap-3 rounded-sm px-2.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <it.icon size={16} strokeWidth={2} className="text-gray-500" />
                {it.label}
              </Link>
            ))}
          </div>

          {/* Footer: sign out */}
          <div className="border-t border-gray-150 pt-1">
            <form action={signOut}>
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100/50"
              >
                <LogOut size={16} strokeWidth={2} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
