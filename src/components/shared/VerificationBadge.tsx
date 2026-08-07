import { BadgeCheck, Clock, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Status = "PENDING" | "VERIFIED" | "REJECTED" | "NEEDS_MORE_INFO";

/**
 * Single source of truth for what "verified" looks like everywhere it appears
 * (advisor profile, match cards, ops verification). Trust signals are load-bearing,
 * not decorative — green = verified per the role-of-colour rule.
 */
export function VerificationBadge({
  status,
  size = "md",
}: {
  status: Status;
  size?: "sm" | "md";
}) {
  const config = {
    VERIFIED: { icon: BadgeCheck, label: "Verified", cls: "bg-green-100 text-green-700" },
    PENDING: { icon: Clock, label: "Verification pending", cls: "bg-gray-100 text-gray-600" },
    NEEDS_MORE_INFO: { icon: HelpCircle, label: "More info needed", cls: "bg-amber-100 text-amber-700" },
    REJECTED: { icon: XCircle, label: "Not verified", cls: "bg-red-100 text-red-700" },
  }[status];

  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold",
        config.cls,
        size === "sm" ? "px-2 py-0.5 text-2xs" : "px-2.5 py-1 text-xs",
      )}
    >
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={2} />
      {config.label}
    </span>
  );
}
