import "server-only";
import { prisma } from "@/lib/prisma";
import { releasePaymentForBooking } from "@/lib/actions/payments";
import { notifyReviewInvite } from "@/lib/email/notify";

/**
 * The acceptance transition itself — booking completed, payment released, client
 * invited to leave feedback.
 *
 * This lives HERE, in a plain server-only module, and NOT in lib/actions/
 * completion.ts. Every export of a `"use server"` file is registered as a
 * callable server action, so putting an unauthenticated `(bookingId) => release
 * the money` function in one would hand any visitor a way to release any
 * booking's funds by calling the action directly. The authorization lives in the
 * server action that wraps this (confirmBookingCompletion), and the only other
 * caller is the day-7 cron sweep, which is already behind CRON_SECRET.
 *
 * Do not re-export this from a "use server" module.
 */
export async function acceptBookingCompletion(
  bookingId: string,
  opts: { auto?: boolean } = {},
): Promise<boolean> {
  const accepted = await prisma.booking.updateMany({
    where: { id: bookingId, status: "awaiting_confirmation" },
    data: {
      status: "completed",
      clientConfirmedAt: new Date(),
      completionAutoAccepted: opts.auto ?? false,
    },
  });
  // Someone else got there first (the client clicked while the sweep ran, or a
  // dispute moved it) — do nothing rather than release a payment twice.
  if (accepted.count !== 1) return false;

  // Idempotent in its own right: no-ops unless the payment is still "held". It
  // sends the advisor their payout confirmation, so there's no separate "your
  // client accepted" email to the advisor — that would just be two at once.
  await releasePaymentForBooking(bookingId);

  await notifyReviewInvite(bookingId, { auto: opts.auto ?? false });

  return true;
}
