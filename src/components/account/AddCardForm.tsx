"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { createSetupIntent } from "@/lib/actions/payment-methods";

/**
 * Card entry via Stripe.js Elements. Gets a SetupIntent from the server, then
 * confirms the card client-side (card details never touch our server). On success
 * refreshes so the new card appears in the list.
 */
const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = pk ? loadStripe(pk) : null;

export function AddCardForm({ onDone }: { onDone: () => void }) {
  if (!stripePromise) {
    return (
      <p className="mt-3 text-sm text-gray-500">
        Card entry isn&apos;t available — the Stripe publishable key isn&apos;t configured.
      </p>
    );
  }
  return (
    <Elements stripe={stripePromise}>
      <Inner onDone={onDone} />
    </Elements>
  );
}

function Inner({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    const { clientSecret, error: intentError } = await createSetupIntent();
    if (intentError || !clientSecret) {
      setError(intentError ?? "Couldn't start card setup.");
      setBusy(false);
      return;
    }
    const card = elements.getElement(CardElement);
    if (!card) {
      setBusy(false);
      return;
    }
    const { error: confirmError } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card },
    });
    if (confirmError) {
      setError(confirmError.message ?? "That card couldn't be saved.");
      setBusy(false);
      return;
    }
    setBusy(false);
    onDone();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="rounded-sm border border-gray-200 px-3 py-3">
        <CardElement
          options={{
            style: {
              base: { fontSize: "15px", color: "#111114", "::placeholder": { color: "#a6a6ae" } },
              invalid: { color: "#c22a21" },
            },
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !stripe}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save card"}
        </button>
        <button type="button" onClick={onDone} className="px-2 py-2 text-sm font-semibold text-gray-500 hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}
