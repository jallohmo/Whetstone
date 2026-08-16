"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { notifyMatchesReady } from "@/lib/email/notify";

/** Ops-only guard for the matching actions. Middleware gates /ops/*; this is the
 * server-side backstop, since a server action is reachable independently of the
 * page that renders its form. */
async function requireOps() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OPS_ADMIN") {
    throw new Error("Only ops can run the matching workbench.");
  }
  return user;
}

/**
 * A3 / C1 — Ops records a match decision for an open need.
 *
 * The decision log is NOT optional: advisorsConsidered + advisorChosenId + reason
 * are all written together. This is the Phase 2/3 data-moat dependency, so it's
 * enforced here, not left as a skippable field.
 *
 * Writing a decision adds ONE advisor to the shortlist and deliberately does NOT
 * change Need.status or notify the client — ops usually shortlists two or three
 * people across separate submissions. Releasing the assembled shortlist is a
 * separate, explicit step (sendShortlistToClient), which is what the client sees
 * and what triggers their email.
 */
export async function createMatchDecision(formData: FormData) {
  const ops = await requireOps();

  const needId = String(formData.get("needId") ?? "");
  const advisorChosenId = String(formData.get("advisorChosenId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const advisorsConsidered = formData
    .getAll("advisorsConsidered")
    .map((v) => String(v));

  if (!needId || !advisorChosenId || !reason) {
    throw new Error("Need, chosen advisor, and a reason are all required.");
  }
  if (!advisorsConsidered.includes(advisorChosenId)) {
    advisorsConsidered.push(advisorChosenId);
  }

  await prisma.matchDecision.create({
    data: {
      needId,
      advisorChosenId,
      advisorsConsidered,
      reason,
      // The real ops user, not a placeholder — the decision log is only evidence
      // if it records who actually decided.
      decidedBy: ops.id,
    },
  });

  revalidatePath("/ops");
  revalidatePath("/ops/needs");
  revalidatePath(`/ops/needs/${needId}/match`);
  revalidatePath(`/needs/${needId}/matches`);
  // Back to the workbench, not the queue: ops usually adds another advisor next.
  redirect(`/ops/needs/${needId}/match`);
}

/**
 * A3 — Release the assembled shortlist to the client: flip the need to "matched"
 * and email them once.
 *
 * The status flip is a conditional updateMany rather than a read-then-write, so
 * it is atomic and idempotent: only the request that actually performs the
 * open -> matched transition sends the email. A double-click, two ops staff
 * hitting send together, or a retried request cannot notify the client twice.
 */
export async function sendShortlistToClient(formData: FormData) {
  await requireOps();

  const needId = String(formData.get("needId") ?? "");
  if (!needId) throw new Error("A need id is required.");

  const shortlisted = await prisma.matchDecision.count({ where: { needId } });
  if (shortlisted === 0) {
    throw new Error("Shortlist at least one advisor before sending it to the client.");
  }

  const { count } = await prisma.need.updateMany({
    where: { id: needId, status: "open" },
    data: { status: "matched" },
  });

  if (count === 1) await notifyMatchesReady(needId);

  revalidatePath("/ops");
  revalidatePath("/ops/needs");
  revalidatePath(`/ops/needs/${needId}/match`);
  revalidatePath(`/needs/${needId}/matches`);
  redirect("/ops/needs");
}
