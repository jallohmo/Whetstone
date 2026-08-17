"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { acceptBookingCompletion } from "@/lib/booking-completion";
import { notifyCompletionAwaitingConfirmation } from "@/lib/email/notify";
import {
  COMPLETABLE_BOOKING_STATUSES,
  SESSION_OUTCOMES,
  completionReadiness,
  type SessionOutcome,
} from "@/lib/booking-status";

/**
 * Two-sided booking completion.
 *
 * The advisor marks the work done, the client accepts, and only that acceptance
 * releases the held payment. Splitting it this way is the point: before, a
 * client's optional review was the sole completion signal, so an advisor whose
 * client never came back was never paid. Now the advisor can always start the
 * clock, and the nightly sweep (api/cron/booking-lifecycle) finishes it if the
 * client stays quiet.
 *
 * Guards to hold on to when editing:
 *  - only the booking's advisor may mark complete, only its client may accept;
 *  - every session must have a recorded outcome first, so sessionCount actually
 *    means something and a 3-session package can't be closed after session 1;
 *  - each transition re-checks the current status inside an atomic updateMany,
 *    so a double-submit or a race can't release a payment twice.
 */

/** Load a booking the caller is the advisor on, or throw. */
async function advisorBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      advisor: { select: { userId: true } },
      sessions: { orderBy: { scheduledAt: "asc" } },
    },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.advisor.userId !== userId) {
    throw new Error("Only the advisor on this booking can do that.");
  }
  return booking;
}

/**
 * Advisor records how one session went, once its start time has passed. This is
 * the per-session trail that booking completion is gated on, and the evidence a
 * no-show dispute later leans on.
 */
export async function markSessionOutcome(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to update a session.");

  const sessionId = String(formData.get("sessionId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!sessionId) throw new Error("Missing session.");
  if (!SESSION_OUTCOMES.includes(outcome as SessionOutcome)) {
    throw new Error("Pick a valid session outcome.");
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { booking: { include: { advisor: { select: { userId: true } } } } },
  });
  if (!session) throw new Error("Session not found.");
  if (session.booking.advisor.userId !== user.id) {
    throw new Error("Only the advisor on this booking can record a session outcome.");
  }
  if (session.scheduledAt > new Date()) {
    throw new Error("You can only record an outcome after the session's start time.");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { status: outcome, outcomeAt: new Date() },
  });

  revalidatePath(`/bookings/${session.bookingId}/messages`);
  revalidatePath("/advisor/bookings");
}

/**
 * Advisor marks the whole booking done -> "awaiting_confirmation", and the client
 * is emailed to come and accept. Requires every session to have an outcome, so
 * the advisor can't close a multi-session package early.
 */
export async function markBookingComplete(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to update a booking.");

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Missing booking.");

  const booking = await advisorBooking(bookingId, user.id);

  // Same predicate the button is disabled by — see lib/booking-status.
  const readiness = completionReadiness(booking.status, booking.sessions);
  if (!readiness.ready) throw new Error(readiness.reason);

  // Atomic transition: only the call that actually moves the row off a
  // completable status proceeds to email, so a double-submit sends one email.
  const moved = await prisma.booking.updateMany({
    where: { id: bookingId, status: { in: [...COMPLETABLE_BOOKING_STATUSES] } },
    data: { status: "awaiting_confirmation", advisorCompletedAt: new Date() },
  });
  if (moved.count !== 1) return;

  await notifyCompletionAwaitingConfirmation(bookingId);

  revalidatePath(`/bookings/${bookingId}/messages`);
  revalidatePath("/advisor/bookings");
  revalidatePath("/advisor");
}

/** The client-facing accept button on /bookings/[id]/confirm-completion. */
export async function confirmBookingCompletion(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to confirm a booking.");

  const bookingId = String(formData.get("bookingId") ?? "");
  if (!bookingId) throw new Error("Missing booking.");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: { select: { userId: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.customer.userId !== user.id) {
    throw new Error("Only the client on this booking can confirm it.");
  }
  if (booking.status !== "awaiting_confirmation") {
    // Already accepted (or disputed) — send them somewhere sensible rather than error.
    redirect(`/bookings/${bookingId}/review`);
  }

  await acceptBookingCompletion(bookingId);

  revalidatePath("/bookings");
  revalidatePath("/");
  redirect(`/bookings/${bookingId}/review?accepted=1`);
}
