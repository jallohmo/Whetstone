"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { AddCardForm } from "./AddCardForm";
import { detachPaymentMethod, type SavedCard } from "@/lib/actions/payment-methods";

/**
 * Customer Payment methods (9c). Lists saved cards and adds new ones via Stripe
 * Elements. `canAdd` is false (with a `reason`) when Stripe or the customer's
 * profile isn't ready — the card still renders, just without the add flow.
 */
export function PaymentMethods({
  cards,
  canAdd,
  reason,
}: {
  cards: SavedCard[];
  canAdd: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(id: string) {
    setRemoving(id);
    startTransition(async () => {
      await detachPaymentMethod(id);
      setRemoving(null);
      router.refresh();
    });
  }

  return (
    <div>
      {cards.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <span className="inline-flex h-9 w-12 items-center justify-center rounded-sm bg-gray-200 text-2xs font-bold tracking-wide text-gray-500">
            CARD
          </span>
          <p className="text-sm text-gray-500">No saved cards yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {cards.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-12 items-center justify-center rounded-sm bg-brand-blue text-2xs font-bold uppercase tracking-wide text-white">
                  {c.brand.length > 4 ? c.brand.slice(0, 4) : c.brand}
                </span>
                <div>
                  <p className="text-body font-semibold capitalize text-ink">
                    {c.brand} ending {c.last4}
                  </p>
                  <p className="ws-mono text-sm text-gray-500">
                    Expires {String(c.expMonth).padStart(2, "0")}/{String(c.expYear).slice(-2)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={removing === c.id}
                className="text-sm font-semibold text-red-700 hover:underline disabled:opacity-50"
              >
                {removing === c.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {canAdd ? (
        adding ? (
          <AddCardForm onDone={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-gray-400"
          >
            <Plus size={15} strokeWidth={2} />
            Add payment method
          </button>
        )
      ) : (
        <p className="mt-3 text-xs text-gray-400">{reason ?? "Adding cards isn't available yet."}</p>
      )}
    </div>
  );
}
