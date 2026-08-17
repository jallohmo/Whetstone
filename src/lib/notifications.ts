import type { UserRole } from "@prisma/client";

/**
 * Notification preferences (screens 9c/14c). Stored as a small JSON map on
 * User.notificationPrefs; defaults live here so an absent value reads as the
 * default rather than "off". Keys are role-specific.
 */
export interface NotificationKey {
  key: string;
  label: string;
  description: string;
  default: boolean;
}

export const NOTIFICATION_KEYS: Record<"CUSTOMER" | "ADVISOR", NotificationKey[]> = {
  CUSTOMER: [
    { key: "sessionReminders", label: "Session reminders", description: "A nudge before each booked session.", default: true },
    { key: "bookingUpdates", label: "Booking updates", description: "When an advisor marks work complete and needs your confirmation.", default: true },
    { key: "newMessages", label: "New messages", description: "When an advisor replies in your thread.", default: true },
    { key: "productUpdates", label: "Product updates", description: "Occasional news about Whetstone.", default: false },
  ],
  ADVISOR: [
    { key: "newBookings", label: "New bookings", description: "When a client books one of your slots.", default: true },
    { key: "newMessages", label: "New messages", description: "When a client replies in a thread.", default: true },
    { key: "payoutConfirmations", label: "Payout confirmations", description: "When held earnings are released to you.", default: true },
  ],
};

/** The key list for a role (customers by default; ops has no settings page). */
export function keysForRole(role: UserRole): NotificationKey[] {
  return role === "ADVISOR" ? NOTIFICATION_KEYS.ADVISOR : NOTIFICATION_KEYS.CUSTOMER;
}

/** Merge stored prefs over the role defaults into a plain boolean map. */
export function resolvePrefs(
  role: UserRole,
  stored: unknown,
): Record<string, boolean> {
  const map = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const out: Record<string, boolean> = {};
  for (const k of keysForRole(role)) {
    out[k.key] = typeof map[k.key] === "boolean" ? (map[k.key] as boolean) : k.default;
  }
  return out;
}
