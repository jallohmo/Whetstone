"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";

function origin(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Start (or resume) Stripe Connect Express onboarding so the advisor can receive
 * payouts. Creates the connected account on first run, stores its id on the
 * profile, then redirects to Stripe's hosted onboarding.
 */
export async function startPayoutOnboarding() {
  if (!stripeEnabled) throw new Error("Payments aren't configured yet.");

  const user = await getCurrentUser();
  if (!user || user.role !== "ADVISOR") throw new Error("Advisors only.");

  const profile = await prisma.advisorProfile.findUnique({ where: { userId: user.id } });
  if (!profile) redirect("/advisor/apply");

  const stripe = getStripe();
  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
      capabilities: { transfers: { requested: true } },
      metadata: { advisorProfileId: profile.id },
    });
    accountId = account.id;
    await prisma.advisorProfile.update({
      where: { id: profile.id },
      data: { stripeAccountId: accountId },
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin()}/advisor/earnings`,
    return_url: `${origin()}/advisor/earnings`,
    type: "account_onboarding",
  });

  redirect(link.url);
}
