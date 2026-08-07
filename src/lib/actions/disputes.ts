"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizedBooking } from "@/lib/actions/messages";

/**
 * Raise a dispute/flag on a booking. Either party may raise one; it lands in the
 * ops queue (Screen 15) and opens the resolution view (Screen 18). Marks the
 * booking "disputed".
 */
export async function raiseDispute(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to report a problem.");

  const bookingId = String(formData.get("bookingId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!bookingId || !notes) throw new Error("Tell us what went wrong.");

  const booking = await getAuthorizedBooking(bookingId, user.id, false);
  if (!booking) throw new Error("You don't have access to this booking.");

  await prisma.$transaction([
    prisma.dispute.create({
      data: { bookingId, raisedBy: user.id, status: "open", notes },
    }),
    prisma.booking.update({ where: { id: bookingId }, data: { status: "disputed" } }),
  ]);

  revalidatePath("/ops");
  revalidatePath(`/bookings/${bookingId}/messages`);
  redirect(`/bookings/${bookingId}/messages?reported=1`);
}

/**
 * Screen 18 — ops resolves or escalates a dispute. Appends a resolution note to
 * the evidence trail and, on resolve, moves the booking to "completed". OPS only.
 */
export async function resolveDispute(formData: FormData) {
  const ops = await getCurrentUser();
  if (!ops || ops.role !== "OPS_ADMIN") throw new Error("Only ops can resolve disputes.");

  const disputeId = String(formData.get("disputeId") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!disputeId || !["resolve", "escalate"].includes(action)) {
    throw new Error("A dispute and a valid action are required.");
  }

  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new Error("Dispute not found.");

  const status = action === "resolve" ? "resolved" : "escalated";
  const stamped = `${dispute.notes}\n\n[${status} by ops${note ? `: ${note}` : ""}]`;

  await prisma.$transaction([
    prisma.dispute.update({ where: { id: disputeId }, data: { status, notes: stamped } }),
    ...(action === "resolve"
      ? [prisma.booking.update({ where: { id: dispute.bookingId }, data: { status: "completed" } })]
      : []),
  ]);

  revalidatePath("/ops");
  revalidatePath("/ops/disputes");
  redirect("/ops/disputes");
}
