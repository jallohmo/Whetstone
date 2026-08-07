"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * A3 / C1 — Ops records a match decision for an open need.
 *
 * The decision log is NOT optional: advisorsConsidered + advisorChosenId + reason
 * are all written together, in one transaction with flipping Need.status to
 * "matched". This is the Phase 2/3 data-moat dependency, so it's enforced here,
 * not left as a skippable field.
 *
 * `decidedBy` is the ops user id — hardcoded to a placeholder until auth is wired.
 */
export async function createMatchDecision(formData: FormData) {
  const needId = String(formData.get("needId") ?? "");
  const advisorChosenId = String(formData.get("advisorChosenId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const advisorsConsidered = formData
    .getAll("advisorsConsidered")
    .map((v) => String(v));
  const decidedBy = String(formData.get("decidedBy") ?? "ops-system");

  if (!needId || !advisorChosenId || !reason) {
    throw new Error("Need, chosen advisor, and a reason are all required.");
  }
  if (!advisorsConsidered.includes(advisorChosenId)) {
    advisorsConsidered.push(advisorChosenId);
  }

  await prisma.$transaction([
    prisma.matchDecision.create({
      data: { needId, advisorChosenId, advisorsConsidered, reason, decidedBy },
    }),
    prisma.need.update({ where: { id: needId }, data: { status: "matched" } }),
  ]);

  revalidatePath("/ops");
  revalidatePath(`/needs/${needId}/matches`);
  redirect("/ops");
}
