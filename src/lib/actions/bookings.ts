"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, displayName } from "@/lib/auth";

/**
 * A4/A5 — Create a booking from an advisor + package. Session count, scope, price
 * and CURRENCY are all COPIED from the package at booking time (never referenced
 * live), protecting the bounded-scope guarantee if packages change later.
 *
 * Customer identity: always the signed-in user. Middleware gates /bookings/*, so
 * the redirect below is the server-side backstop. (This replaced a guest fallback
 * that minted a User row with a random id and a synthetic @whetstone.local email —
 * an account that could never be signed into, because the id did not exist in
 * Supabase auth.users.)
 */
export async function createBooking(formData: FormData) {
  const current = await getCurrentUser();
  if (!current) redirect("/signup");

  const advisorId = String(formData.get("advisorId") ?? "");
  const packageId = String(formData.get("packageId") ?? "");
  const needId = String(formData.get("needId") ?? "") || null;
  const slotId = String(formData.get("slotId") ?? "") || null;

  if (!advisorId || !packageId) {
    throw new Error("Advisor and package are required to book.");
  }

  const pkg = await prisma.package.findUniqueOrThrow({ where: { id: packageId } });

  const need = needId
    ? await prisma.need.findUnique({
        where: { id: needId },
        select: { industryId: true, customerId: true },
      })
    : null;
  // Only a need that resolved is worth recording; a stale or bogus id in the
  // form must not be written as a dangling FK.
  const linkedNeedId = need ? needId : null;

  const industryId =
    need?.industryId ||
    (await prisma.industryTaxonomy.findFirstOrThrow({ where: { parentId: null } })).id;

  const customer = await resolveAuthedCustomer(current, industryId);

  // Needs are owned from creation, so this is an ownership assertion rather than
  // the guest-need attachment it replaced: a booking must not quietly re-parent
  // someone else's need by passing its id in the form.
  if (needId && need?.customerId !== customer.id) {
    throw new Error("That need doesn't belong to your account.");
  }

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
        // The brief the advisor reads before the session (advisor/bookings and
        // the booking thread). Stored rather than re-derived, so a client posting
        // a second challenge later can't retarget this booking's context.
        needId: linkedNeedId,
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
        // slotId is what the expiry sweep releases if this booking is never paid
        // for — see lib/booking-expiry.ts.
        data: { bookingId: b.id, scheduledAt: slot.startsAt, status: "scheduled", slotId: slot.id },
      });
      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { isBooked: true },
      });
    }

    return b;
  });

  redirect(`/bookings/${booking.id}/checkout`);
}

/**
 * The signed-in customer's profile. The User row already exists (written by the
 * auth trigger at signup) and createNeed creates the profile for anyone who came
 * through the need funnel — so this only creates one for a client who booked an
 * advisor directly without ever posting a need.
 */
async function resolveAuthedCustomer(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  industryId: string,
) {
  const existing = await prisma.customerProfile.findUnique({
    where: { userId: user.id },
  });
  if (existing) return existing;
  return prisma.customerProfile.create({
    data: { userId: user.id, businessName: displayName(user), industryId },
  });
}
