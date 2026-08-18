"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/** Resolve the signed-in advisor's profile id, or throw. */
async function requireAdvisorProfileId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADVISOR") {
    throw new Error("Only advisors can manage availability.");
  }
  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Complete your advisor application first.");
  return profile.id;
}

/**
 * What the add-slot form renders back to the advisor. Validation failures are
 * RETURNED, never thrown: a thrown error in a server action reaches the client as
 * an unhandled exception, and with no error boundary in the advisor segment that
 * is Next's generic "server-side exception" page plus a digest — which is exactly
 * how "that time is in the past" used to present. Mirrors AuthFormState.
 */
export interface AvailabilityFormState {
  error?: string;
  /** Set on success so the form can confirm rather than just silently reset. */
  added?: string;
}

/**
 * Screen 12 (A5). Add an availability slot. Uses an explicit "add" submit
 * (confirm-before-save, not instant toggle) to reduce mis-click risk for a
 * lower-digital-fluency audience.
 *
 * Ordinary mistakes — a blank field, a time already gone, a slot that's already
 * there — are answers, not crashes. Only conditions the UI can't produce (a
 * non-advisor posting to this action) still throw.
 */
export async function addAvailabilitySlot(
  _prev: AvailabilityFormState,
  formData: FormData,
): Promise<AvailabilityFormState> {
  const advisorId = await requireAdvisorProfileId();

  const startRaw = String(formData.get("startsAt") ?? "");
  const durationMin = parseInt(String(formData.get("durationMin") ?? "60"), 10);
  const startsAt = new Date(startRaw);

  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Pick a date and time for the slot." };
  }
  if (startsAt.getTime() < Date.now()) {
    return { error: "That time has already passed — pick a future date and time." };
  }

  const endsAt = new Date(startsAt.getTime() + (durationMin || 60) * 60_000);

  // Avoid exact-duplicate slots. Saying so beats silently doing nothing, which
  // reads as a failed save.
  const clash = await prisma.availabilitySlot.findFirst({
    where: { advisorId, startsAt },
  });
  if (clash) {
    return { error: "You already have a slot starting at that time." };
  }

  await prisma.availabilitySlot.create({ data: { advisorId, startsAt, endsAt } });

  revalidatePath("/advisor/availability");
  return { added: startsAt.toISOString() };
}

/** Remove an availability slot the advisor owns (only if not already booked). */
export async function removeAvailabilitySlot(formData: FormData) {
  const advisorId = await requireAdvisorProfileId();
  const slotId = String(formData.get("slotId") ?? "");

  await prisma.availabilitySlot.deleteMany({
    where: { id: slotId, advisorId, isBooked: false },
  });

  revalidatePath("/advisor/availability");
}
