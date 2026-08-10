"use client";

import { Toggle } from "@/components/ui/Toggle";
import { updateNotificationPrefs } from "@/lib/actions/account";
import type { NotificationKey } from "@/lib/notifications";

/**
 * Shared Notifications card (9c/14c). Each row is a labelled toggle; the form
 * auto-submits on any change (optimistic feel, no Save button) and the server
 * action persists the whole map. Works without JS too — it just needs a submit.
 */
export function NotificationSettings({
  keys,
  values,
}: {
  keys: NotificationKey[];
  values: Record<string, boolean>;
}) {
  return (
    <form
      action={updateNotificationPrefs}
      onChange={(e) => e.currentTarget.requestSubmit()}
    >
      <div className="flex flex-col divide-y divide-gray-100">
        {keys.map((k) => (
          <div key={k.key} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div>
              <p className="text-body font-semibold text-ink">{k.label}</p>
              <p className="mt-0.5 text-sm text-gray-500">{k.description}</p>
            </div>
            <Toggle name={k.key} defaultChecked={values[k.key]} aria-label={k.label} />
          </div>
        ))}
      </div>
      <noscript>
        <button type="submit" className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
          Save preferences
        </button>
      </noscript>
    </form>
  );
}
