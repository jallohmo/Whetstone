import { resolvePrefs, keysForRole, NOTIFICATION_KEYS } from "@/lib/notifications";

/**
 * Notification preferences are a sparse JSON map on User. The important property
 * is that an ABSENT key reads as the role's default rather than as "off" — a
 * client who has never opened the settings screen must still get their session
 * reminders.
 */
describe("notification preferences", () => {
  describe("resolvePrefs", () => {
    it("falls back to role defaults when nothing is stored", () => {
      const prefs = resolvePrefs("CUSTOMER", null);
      expect(prefs.sessionReminders).toBe(true);
      expect(prefs.newMessages).toBe(true);
      // Marketing is the one that defaults off.
      expect(prefs.productUpdates).toBe(false);
    });

    it("lets a stored value override the default in both directions", () => {
      const prefs = resolvePrefs("CUSTOMER", {
        sessionReminders: false,
        productUpdates: true,
      });
      expect(prefs.sessionReminders).toBe(false);
      expect(prefs.productUpdates).toBe(true);
      // Untouched key still reads as its default.
      expect(prefs.newMessages).toBe(true);
    });

    it("uses advisor keys for advisors", () => {
      const prefs = resolvePrefs("ADVISOR", null);
      expect(prefs.newBookings).toBe(true);
      expect(prefs.payoutConfirmations).toBe(true);
      // Customer-only key must not leak into the advisor map.
      expect(prefs.sessionReminders).toBeUndefined();
    });

    it("ignores non-boolean stored values instead of coercing them", () => {
      const prefs = resolvePrefs("CUSTOMER", {
        sessionReminders: "yes",
        newMessages: 0,
      });
      expect(prefs.sessionReminders).toBe(true);
      expect(prefs.newMessages).toBe(true);
    });

    it.each([
      ["a string", "nonsense"],
      ["a number", 7],
      ["an array", []],
      ["undefined", undefined],
    ])("survives %s as the stored blob", (_label, stored) => {
      expect(() => resolvePrefs("CUSTOMER", stored)).not.toThrow();
      expect(resolvePrefs("CUSTOMER", stored).sessionReminders).toBe(true);
    });

    it("returns exactly the keys defined for the role", () => {
      const prefs = resolvePrefs("CUSTOMER", null);
      expect(Object.keys(prefs).sort()).toEqual(
        NOTIFICATION_KEYS.CUSTOMER.map((k) => k.key).sort(),
      );
    });
  });

  describe("keysForRole", () => {
    it("gives advisors the advisor set and everyone else the customer set", () => {
      expect(keysForRole("ADVISOR")).toBe(NOTIFICATION_KEYS.ADVISOR);
      expect(keysForRole("CUSTOMER")).toBe(NOTIFICATION_KEYS.CUSTOMER);
      // Ops has no settings screen; the customer set is the safe fallback.
      expect(keysForRole("OPS_ADMIN")).toBe(NOTIFICATION_KEYS.CUSTOMER);
    });
  });
});
