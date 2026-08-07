"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { releasePaymentForBooking } from "@/lib/actions/payments";

/**
 * Screen 9 (B3, C2). Post-session review + outcome survey. Writes Review (rating
 * feeds advisor profiles/match cards) and OutcomeSurvey (structured fields for
 * later categorisation — problemCategory stays nullable until Phase 2). One of
 * each per booking (unique bookingId), so we upsert. Only the booking's customer
 * may submit.
 */
export async function submitReview(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to leave a review.");

  const bookingId = String(formData.get("bookingId") ?? "");
  const rating = parseInt(String(formData.get("rating") ?? ""), 10);
  const problemAddressed = String(formData.get("problemAddressed") ?? "");
  const wouldRebook = String(formData.get("wouldRebook") ?? "") === "true";
  const freeText = String(formData.get("freeTextContext") ?? "").trim() || null;
  const writtenReview = String(formData.get("writtenReview") ?? "").trim() || null;

  if (!bookingId) throw new Error("Missing booking.");
  if (Number.isNaN(rating) || rating < 1 || rating > 5) throw new Error("Pick a rating from 1 to 5.");
  if (!["yes", "partially", "no"].includes(problemAddressed)) throw new Error("Tell us if it helped.");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: { select: { userId: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.customer.userId !== user.id) {
    throw new Error("Only the customer on this booking can review it.");
  }

  await prisma.$transaction([
    prisma.review.upsert({
      where: { bookingId },
      update: { rating, writtenReview },
      create: { bookingId, rating, writtenReview },
    }),
    prisma.outcomeSurvey.upsert({
      where: { bookingId },
      update: { problemAddressed, wouldRebook, freeTextContext: freeText },
      create: { bookingId, problemAddressed, wouldRebook, freeTextContext: freeText },
    }),
    prisma.booking.update({ where: { id: bookingId }, data: { status: "completed" } }),
  ]);

  // Session done -> release the held funds to the advisor (minus commission).
  await releasePaymentForBooking(bookingId);

  revalidatePath(`/advisors/${booking.advisorId}`);
  redirect(`/bookings/${bookingId}/confirmed`);
}
