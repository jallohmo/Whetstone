"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * Screen 10 — Advisor application (A1, B1, B2). Creates/updates the signed-in
 * advisor's AdvisorProfile and connects their specialties. The profile starts in
 * PENDING and is NOT visible to customers or bookable until ops flips it to
 * VERIFIED (application-level gate, per the auth model). Credential/ID documents
 * are uploaded client-side to the private advisor-credentials Storage bucket
 * before this action runs (see AdvisorOnboardingForm); ops reads them at review.
 */
export async function submitAdvisorApplication(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/advisor/apply");
  if (user.role !== "ADVISOR") {
    throw new Error("Only advisor accounts can submit an application.");
  }

  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const yearsExperience = parseInt(String(formData.get("yearsExperience") ?? ""), 10);
  const specialtyIds = formData.getAll("specialtyIds").map((v) => String(v));
  const otherSpecialties = String(formData.get("otherSpecialties") ?? "").trim();

  if (!bio || Number.isNaN(yearsExperience) || yearsExperience < 0) {
    throw new Error("Bio and a valid years-of-experience are required.");
  }
  // At least one selected capability OR a free-text "other" so no advisor is stuck.
  if (specialtyIds.length === 0 && !otherSpecialties) {
    throw new Error("Pick at least one area — or tell us what's missing under “Something not listed?”.");
  }

  const existing = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (existing) {
    // Re-submission (e.g. after NEEDS_MORE_INFO): update details, reset to PENDING,
    // replace the specialty set.
    await prisma.advisorProfile.update({
      where: { id: existing.id },
      data: {
        headline: headline || null,
        bio,
        yearsExperience,
        otherSpecialties: otherSpecialties || null,
        verificationStatus: "PENDING",
        specialtyTags: { set: specialtyIds.map((id) => ({ id })) },
      },
    });
  } else {
    await prisma.advisorProfile.create({
      data: {
        userId: user.id,
        headline: headline || null,
        bio,
        yearsExperience,
        otherSpecialties: otherSpecialties || null,
        verificationStatus: "PENDING",
        specialtyTags: { connect: specialtyIds.map((id) => ({ id })) },
      },
    });
  }

  revalidatePath("/advisor/verification-status");
  revalidatePath("/ops");
  redirect("/advisor/verification-status");
}
