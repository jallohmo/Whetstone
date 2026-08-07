"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { VerificationStatus } from "@prisma/client";

/**
 * Screen 17 — Ops verification decision (B1, B2). Writes a VerificationRecord
 * (the durable evidence trail — never a bare status flip) and updates
 * AdvisorProfile.verificationStatus, atomically. Failed automated checks route
 * here for human review; nothing is auto-rejected.
 */
const DECISION_TO_STATUS: Record<string, VerificationStatus> = {
  approve: "VERIFIED",
  reject: "REJECTED",
  needs_info: "NEEDS_MORE_INFO",
};

export async function reviewAdvisor(formData: FormData) {
  const ops = await getCurrentUser();
  if (!ops || ops.role !== "OPS_ADMIN") {
    throw new Error("Only ops admins can review advisors.");
  }

  const advisorId = String(formData.get("advisorId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const evidenceType = String(formData.get("type") ?? "manual_review");
  const notes = String(formData.get("notes") ?? "").trim();

  const status = DECISION_TO_STATUS[decision];
  if (!advisorId || !status) throw new Error("A valid advisor and decision are required.");
  if (!notes) throw new Error("Add a note — the decision must leave an evidence trail.");

  await prisma.$transaction([
    prisma.verificationRecord.create({
      data: { advisorId, type: evidenceType, notes, reviewedBy: ops.id },
    }),
    prisma.advisorProfile.update({
      where: { id: advisorId },
      data: {
        verificationStatus: status,
        // Approving a manual identity review clears the identity gate too.
        ...(decision === "approve" && evidenceType === "id_check"
          ? { identityCheckPassed: true }
          : {}),
      },
    }),
  ]);

  revalidatePath("/ops");
  revalidatePath("/ops/advisors");
  redirect("/ops/advisors");
}
