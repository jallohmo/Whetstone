import { Bell, CreditCard, Lock, User as UserIcon, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Left-column section nav (screens 9c/14c) — anchor links to the stacked cards on
 * the right. The first item renders active (ink pill); the rest are scroll
 * targets. Kept server-side (plain anchors) to stay simple and JS-free.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const CUSTOMER_SECTIONS: NavItem[] = [
  { label: "Profile", href: "#personal", icon: UserIcon },
  { label: "Security", href: "#security", icon: Lock },
  { label: "Notifications", href: "#notifications", icon: Bell },
  { label: "Payments", href: "#payments", icon: CreditCard },
];

export const ADVISOR_SECTIONS: NavItem[] = [
  { label: "Profile", href: "#profile", icon: UserIcon },
  { label: "Security", href: "#security", icon: Lock },
  { label: "Payouts", href: "#payouts", icon: Wallet },
  { label: "Notifications", href: "#notifications", icon: Bell },
];

export function SectionNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="rounded-lg bg-white p-2 shadow-card">
      {items.map((it, i) => (
        <a
          key={it.href}
          href={it.href}
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition duration-DEFAULT ease-soft",
            i === 0 ? "bg-ink text-white" : "text-gray-700 hover:bg-gray-100",
          )}
        >
          <it.icon size={16} strokeWidth={2} className={i === 0 ? "text-white" : "text-gray-400"} />
          {it.label}
        </a>
      ))}
    </nav>
  );
}
