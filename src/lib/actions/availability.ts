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
 * Screen 12 (A5). Add an availability slot. Uses an explicit "add" submit
 * (confirm-before-save, not instant toggle) to reduce mis-click risk for a
 * lower-digital-fluency audience.
 */
export async function addAvailabilitySlot(formData: FormData) {
  const advisorId = await requireAdvisorProfileId();

  const startRaw = String(formData.get("startsAt") ?? "");
  const durationMin = parseInt(String(formData.get("durationMin") ?? "60"), 10);
  const startsAt = new Date(startRaw);

  if (Number.isNaN(startsAt.getTime())) throw new Error("Pick a valid date and time.");
  if (startsAt.getTime() < Date.now()) throw new Error("That time is in the past.");

  const endsAt = new Date(startsAt.getTime() + (durationMin || 60) * 60_000);

  // Avoid exact-duplicate slots.
  const clash = await prisma.availabilitySlot.findFirst({
    where: { advisorId, startsAt },
  });
  if (!clash) {
    await prisma.availabilitySlot.create({ data: { advisorId, startsAt, endsAt } });
  }

  revalidatePath("/advisor/availability");
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
