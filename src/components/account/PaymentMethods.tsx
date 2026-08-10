import { Plus } from "lucide-react";

/**
 * Customer Payment methods (9c) — scaffolded. Saved cards need a Stripe Customer +
 * SetupIntent + Elements flow, which is out of this pass. The card renders its
 * real shape in a clearly-disabled "coming soon" state so nothing looks live.
 */
export function PaymentMethods() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 opacity-60">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-12 items-center justify-center rounded-sm bg-brand-blue text-2xs font-bold tracking-wide text-white">
            VISA
          </span>
          <div>
            <p className="text-body font-semibold text-ink">No saved cards yet</p>
            <p className="text-sm text-gray-500">You&apos;ll pay per booking at checkout for now.</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled
        className="mt-3 inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-400"
      >
        <Plus size={15} strokeWidth={2} />
        Add payment method
      </button>
      <p className="mt-2 text-xs text-gray-400">
        Saved cards are coming soon. Today, payment is taken per booking at checkout.
      </p>
    </div>
  );
}
