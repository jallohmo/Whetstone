"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivateAdvisor, reactivateAdvisor } from "@/lib/actions/account";

/**
 * Advisor "Leave the platform" control (14c). Deactivation is a reversible soft
 * state — blocked server-side while active bookings exist. Reactivation restores
 * the profile. Confirmation is required before deactivating.
 */
export function AdvisorDangerZone({ deactivated }: { deactivated: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDeactivate() {
    if (!window.confirm("Deactivate your advisor profile? Clients won't see or be able to book you until you reactivate.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deactivateAdvisor();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function onReactivate() {
    setError(null);
    startTransition(async () => {
      const res = await reactivateAdvisor();
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {deactivated ? (
        <>
          <p className="text-body text-gray-600">
            Your profile is <span className="font-semibold text-ink">deactivated</span> — hidden
            from matches and not bookable. Reactivate whenever you&apos;re ready.
          </p>
          <button
            type="button"
            onClick={onReactivate}
            disabled={pending}
            className="mt-4 inline-flex items-center rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px disabled:opacity-50"
          >
            {pending ? "…" : "Reactivate profile"}
          </button>
        </>
      ) : (
        <>
          <p className="text-body text-gray-600">
            Deactivate your advisor profile. Existing bookings must be completed first.
          </p>
          <button
            type="button"
            onClick={onDeactivate}
            disabled={pending}
            className="mt-4 inline-flex items-center rounded-md border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100/50 disabled:opacity-50"
          >
            {pending ? "…" : "Deactivate account"}
          </button>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
