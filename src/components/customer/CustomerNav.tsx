"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Signed-in customer centre nav (screens 1d onwards). Active row is an ink pill;
 * inactive rows tint on hover. Hidden on small screens where the pill bar is too
 * tight — the dashboard's own deep-links cover navigation there.
 */
const NAV = [
  { href: "/home", label: "Home" },
  { href: "/bookings", label: "Bookings" },
  { href: "/messages", label: "Messages" },
];

export function CustomerNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-pill px-4 py-2 text-sm font-medium transition duration-DEFAULT ease-soft",
              active ? "bg-ink text-white shadow-ink-glow" : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
