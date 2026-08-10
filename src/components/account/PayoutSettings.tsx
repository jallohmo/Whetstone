"use client";

import { Landmark } from "lucide-react";
import { Toggle } from "@/components/ui/Toggle";
import { startPayoutOnboarding } from "@/lib/actions/connect";
import { setPayoutSchedule } from "@/lib/actions/account";

/**
 * Advisor Payout details (14c). Connect/update flows through the existing Stripe
 * Connect onboarding; the weekly-payout schedule is a server preference that
 * auto-saves on toggle.
 */
export function PayoutSettings({
  connected,
  weeklyPayouts,
  stripeEnabled,
}: {
  connected: boolean;
  weeklyPayouts: boolean;
  stripeEnabled: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-12 items-center justify-center rounded-sm bg-ink text-2xs font-bold tracking-wide text-white">
            BANK
          </span>
          <div>
            <p className="text-body font-semibold text-ink">
              {connected ? "Stripe connected" : "No payout account yet"}
            </p>
            <p className="text-sm text-gray-500">
              {connected
                ? "Held earnings are transferred to your connected account."
                : "Connect an account to receive your earnings."}
            </p>
          </div>
        </div>
        {stripeEnabled ? (
          <form action={startPayoutOnboarding}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-gray-300"
            >
              <Landmark size={15} strokeWidth={2} />
              {connected ? "Update" : "Connect"}
            </button>
          </form>
        ) : (
          <span className="rounded-pill bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
            Not configured
          </span>
        )}
      </div>

      <form
        action={setPayoutSchedule}
        onChange={(e) => e.currentTarget.requestSubmit()}
        className="mt-4 flex items-start justify-between gap-4 border-t border-dashed border-gray-300 pt-4"
      >
        <div>
          <p className="text-body font-semibold text-ink">Weekly payouts</p>
          <p className="mt-0.5 text-sm text-gray-500">Release held earnings every Monday.</p>
        </div>
        <Toggle name="weeklyPayouts" defaultChecked={weeklyPayouts} aria-label="Weekly payouts" />
      </form>
    </div>
  );
}
