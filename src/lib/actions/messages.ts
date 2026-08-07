"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Returns the booking with the two parties' user ids, but only if the given user
 * is allowed to see it (the booking's customer, the booking's advisor, or ops).
 * Shared authorization for the messaging thread (Screen 8) — the app-layer mirror
 * of the bookings/messages RLS policies.
 */
export async function getAuthorizedBooking(bookingId: string, userId: string, isOps: boolean) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { select: { userId: true } },
      advisor: { select: { userId: true } },
    },
  });
  if (!booking) return null;
  const isParty = booking.customer.userId === userId || booking.advisor.userId === userId;
  return isParty || isOps ? booking : null;
}

/**
 * Screen 8 (A7). Post a message to a booking thread. Simple — no read receipts or
 * typing indicators at MVP. Only the two parties on the booking may post.
 */
export async function sendMessage(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to send a message.");

  const bookingId = String(formData.get("bookingId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!bookingId || !body) return; // nothing to send

  const booking = await getAuthorizedBooking(bookingId, user.id, user.role === "OPS_ADMIN");
  if (!booking) throw new Error("You don't have access to this conversation.");
  // Ops can read a thread but shouldn't post into it as a party.
  if (user.role === "OPS_ADMIN" &&
      booking.customer.userId !== user.id &&
      booking.advisor.userId !== user.id) {
    throw new Error("Ops can view but not post in a customer/advisor thread.");
  }

  await prisma.message.create({
    data: { bookingId, senderId: user.id, body },
  });

  revalidatePath(`/bookings/${bookingId}/messages`);
}
