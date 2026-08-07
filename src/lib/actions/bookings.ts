"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { platformConfig } from "@/lib/platform-config";

/**
 * A4/A5 — Create a booking from an advisor + package. Session count, scope, price
 * and CURRENCY are all COPIED from the package at booking time (never referenced
 * live), protecting the bounded-scope guarantee if packages change later.
 *
 * Customer identity: once auth is wired this is the signed-in customer. Until then
 * the booking flow resolves-or-creates a lightweight customer from the guest email
 * captured on the need (the "guest need -> real account at booking" conversion in
 * the auth model). The account-creation shim is the only part that changes when
 * Supabase Auth lands — the booking write itself is final.
 */
export async function createBooking(formData: FormData) {
  const advisorId = String(formData.get("advisorId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const needId = String(formData.get("needId") ?? "") || null;
  const email =
    String(formData.get("email") ?? "").trim().toLowerCase() ||
    `guest+${randomUUID().slice(0, 8)}@whetstone.local`;

  if (!advisorId || !packageId) {
    throw new Error("Advisor and package are required to book.");
  }

  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } });

  // Resolve-or-create the customer (stand-in for auth.uid()-backed identity).
  const industryId =
    (needId && (await prisma.need.findUnique({ where: { id: needId } }))?.industryId) ||
    (await prisma.industryTaxonomy.findFirstOrThrow({ where: { parentId: null } })).id;

  const customer = await resolveCustomer(email, industryId);

  const booking = await prisma.booking.create({
    data: {
      customerId: customer.id,
      advisorId,
      packageId,
      // copied-at-booking-time fields
      sessionCount: pkg.sessionCount,
      scopeDescription: pkg.scopeDescription,
      priceCents: pkg.priceCents,
      currency: pkg.currency,
      status: "pending_payment",
      insuranceCoverageConfirmed: false,
    },
  });

  // Attach the guest need to this customer now that they've converted.
  if (needId) {
    await prisma.need.update({
      where: { id: needId },
      data: { customerId: customer.id },
    });
  }

  redirect(`/bookings/${booking.id}/checkout`);
}

/**
 * A6 — Confirm a booking after payment. Creates the held Payment, sets
 * insuranceCoverageConfirmed, and only THEN advances status to "confirmed"
 * (the coverage gate is enforced in application logic, per the schema note).
 * Real Stripe PaymentIntent id arrives from the webhook; a placeholder stands in.
 */
export async function confirmBooking(formData: FormData) {
  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Missing booking id.");

  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });

  if (!platformConfig.insurance.active) {
    throw new Error("Insurance coverage is not active — cannot confirm booking.");
  }

  await prisma.$transaction([
    prisma.payment.upsert({
      where: { bookingId },
      update: {},
      create: {
        bookingId,
        amountCents: booking.priceCents,
        currency: booking.currency,
        status: "held",
        stripePaymentIntentId: `pi_placeholder_${bookingId}`,
      },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { insuranceCoverageConfirmed: true, status: "confirmed" },
    }),
  ]);

  redirect(`/bookings/${bookingId}/confirmed`);
}

/**
 * Stand-in identity resolver. Replace the User row creation with the Supabase
 * auth trigger once auth is wired; the CustomerProfile linkage stays as-is.
 */
async function resolveCustomer(email: string, industryId: string) {
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { customerProfile: true },
  });
  if (existing?.customerProfile) return existing.customerProfile;

  const user =
    existing ??
    (await prisma.user.create({
      data: { id: randomUUID(), email, role: "CUSTOMER" },
    }));

  return prisma.customerProfile.create({
    data: {
      userId: user.id,
      businessName: email.split("@")[0],
      industryId,
    },
  });
}
