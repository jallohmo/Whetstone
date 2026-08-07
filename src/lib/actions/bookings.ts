"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * A4/A5 — Create a booking from an advisor + package. Session count, scope, price
 * and CURRENCY are all COPIED from the package at booking time (never referenced
 * live), protecting the bounded-scope guarantee if packages change later.
 *
 * Customer identity: if the user is signed in (Supabase Auth), the booking is
 * tied to their real CustomerProfile. If not, the guest-need -> account-at-booking
 * fallback still resolves a lightweight customer from an email, so the no-account
 * need flow keeps working end to end.
 */
export async function createBooking(formData: FormData) {
  const advisorId = String(formData.get("advisorId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const needId = String(formData.get("needId") ?? "") || null;
  const slotId = String(formData.get("slotId") ?? "") || null;
  const email =
    String(formData.get("email") ?? "").trim().toLowerCase() ||
    `guest+${randomUUID().slice(0, 8)}@whetstone.local`;

  if (!advisorId || !packageId) {
    throw new Error("Advisor and package are required to book.");
  }

  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } });

  const industryId =
    (needId && (await prisma.need.findUnique({ where: { id: needId } }))?.industryId) ||
    (await prisma.industryTaxonomy.findFirstOrThrow({ where: { parentId: null } })).id;

  // Prefer the authenticated customer; fall back to guest resolution.
  const current = await getCurrentUser();
  const customer = current
    ? await resolveAuthedCustomer(current.id, current.email, industryId)
    : await resolveCustomer(email, industryId);

  // Validate the chosen availability slot (if any) up front.
  const slot = slotId
    ? await prisma.availabilitySlot.findUnique({ where: { id: slotId } })
    : null;
  if (slotId && (!slot || slot.advisorId !== advisorId || slot.isBooked)) {
    throw new Error("That time is no longer available — please pick another.");
  }

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
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

    // Schedule the first session at the chosen slot and reserve it. Multi-session
    // packages schedule their remaining sessions later, by coordination.
    if (slot) {
      await tx.session.create({
        data: { bookingId: b.id, scheduledAt: slot.startsAt, status: "scheduled" },
      });
      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });
    }

    // Attach the guest need to this customer now that they've converted.
    if (needId) {
      await tx.need.update({ where: { id: needId }, data: { customerId: customer.id } });
    }

    return b;
  });

  redirect(`/bookings/${booking.id}/checkout`);
}

/**
 * Authenticated customer: the User row already exists (created by the auth
 * trigger at signup). Reuse their CustomerProfile, creating it on first booking.
 */
async function resolveAuthedCustomer(
  userId: string,
  email: string,
  industryId: string,
) {
  const existing = await prisma.customerProfile.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.customerProfile.create({
    data: { userId, businessName: email.split("@")[0], industryId },
  });
}

/**
 * Guest fallback (no account yet): resolve-or-create a lightweight customer from
 * an email. Used only when nobody is signed in — the guest-need -> booking path.
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
