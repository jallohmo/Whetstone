import Stripe from "stripe";

/**
 * Stripe client — SERVER ONLY. Guarded by STRIPE_SECRET_KEY so the app runs
 * without payments configured (checkout falls back to a direct held-payment in
 * dev; see lib/actions/payments.ts). Never import this into a client component.
 */
const key = process.env.STRIPE_SECRET_KEY;

export const stripeEnabled = Boolean(key);

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  cached ??= new Stripe(key, { apiVersion: "2025-01-27.acacia" as Stripe.LatestApiVersion });
  return cached;
}
