import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyBookingExpired } from "@/lib/email/notify";

/**
 * Cancel an unpaid booking and hand its reserved time back to the advisor.
 *
 * Lives HERE, in a plain server-only module, and NOT in lib/actions/bookings.ts,
 * for the same reason acceptBookingCompletion does: every export of a
 * `"use server"` file is a callable server action, and an unauthenticated
 * `(bookingId) => cancel it` function in one would let any visitor cancel any
 * booking by id. The only caller is the hourly sweep, already behind CRON_SECRET.
 *
 * Do not re-export this from a "use server" module.
 *
 * Returns false when the booking was not still pending payment — the client
 * paid while the sweep was running, and their money must not meet a cancelled
 * booking. The status guard lives inside the updateMany so that race resolves in
 * the database rather than in whichever process read the row first.
 */
export async function expirePendingBooking(bookingId: string): Promise<boolean> {
  const cancelled = await prisma.$transaction(async (tx) => {
    const moved = await tx.booking.updateMany({
      where: { id: bookingId, status: "pending_payment" },
      data: { status: "cancelled", paymentExpiredAt: new Date() },
    });
    if (moved.count !== 1) return false;

    // Free the slots those sessions reserved. Scoped to slotId values actually
    // held by this booking, so a slot reused by anything else is never touched.
    const sessions = await tx.session.findMany({
      where: { bookingId, slotId: { not: null } },
      select: { slotId: true },
    });
    const slotIds = sessions.map((s) => s.slotId!).filter(Boolean);
    if (slotIds.length > 0) {
      await tx.availabilitySlot.updateMany({
        where: { id: { in: slotIds } },
        data: { isBooked: false },
      });
    }
    return true;
  });

  if (!cancelled) return false;

  await notifyBookingExpired(bookingId);
  return true;
}
