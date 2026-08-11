"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getStripe, stripeEnabled } from "@/lib/stripe";

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

async function customerProfileFor(userId: string) {
  return prisma.customerProfile.findUnique({
    where: { userId },
    select: { id: true, stripeCustomerId: true },
  });
}

/** Saved cards for the signed-in customer. Empty when Stripe/customer isn't set up. */
export async function listPaymentMethods(): Promise<{ cards: SavedCard[] }> {
  if (!stripeEnabled) return { cards: [] };
  const user = await getCurrentUser();
  if (!user) return { cards: [] };
  const profile = await customerProfileFor(user.id);
  if (!profile?.stripeCustomerId) return { cards: [] };

  try {
    const stripe = getStripe();
    const list = await stripe.paymentMethods.list({ customer: profile.stripeCustomerId, type: "card" });
    return {
      cards: list.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? "card",
        last4: pm.card?.last4 ?? "••••",
        expMonth: pm.card?.exp_month ?? 0,
        expYear: pm.card?.exp_year ?? 0,
      })),
    };
  } catch {
    return { cards: [] };
  }
}

/**
 * Start a SetupIntent so the customer can save a card (client confirms it with
 * Stripe.js). Lazily creates the Stripe Customer and stores its id on the profile.
 * Requires a CustomerProfile — a customer who hasn't booked yet doesn't have one.
 */
export async function createSetupIntent(): Promise<{ clientSecret?: string; error?: string }> {
  if (!stripeEnabled) return { error: "Payments aren't configured yet." };
  const user = await getCurrentUser();
  if (!user || user.role !== "CUSTOMER") return { error: "Customers only." };

  const profile = await customerProfileFor(user.id);
  if (!profile) return { error: "You can save a card after your first booking." };

  const stripe = getStripe();
  let customerId = profile.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { customerProfileId: profile.id },
    });
    customerId = customer.id;
    await prisma.customerProfile.update({
      where: { id: profile.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });
  return { clientSecret: setupIntent.client_secret ?? undefined };
}

/** Remove a saved card — after verifying it belongs to this customer. */
export async function detachPaymentMethod(paymentMethodId: string): Promise<{ error?: string }> {
  if (!stripeEnabled) return { error: "Payments aren't configured." };
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  const profile = await customerProfileFor(user.id);
  if (!profile?.stripeCustomerId) return { error: "No saved cards." };

  const stripe = getStripe();
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const owner = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (owner !== profile.stripeCustomerId) return { error: "That card isn't on your account." };

  await stripe.paymentMethods.detach(paymentMethodId);
  revalidatePath("/account");
  return {};
}
