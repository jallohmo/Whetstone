"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, displayName } from "@/lib/auth";
import { notifyNeedPosted } from "@/lib/email/notify";

/**
 * A2 — Post a need. Signup-first: a need belongs to a CustomerProfile from the
 * moment it is created. That is what makes the rest of the flow work — the client
 * home can list their needs, ops can email them when the shortlist is sent, and
 * the RLS policy on `needs` (which scopes rows by customer_id -> auth.uid()) is
 * satisfied instead of being bypassed by an ownerless row.
 *
 * Middleware bounces anonymous visitors to /signup?next=/needs/new before they
 * reach this action; the check below is the server-side backstop.
 */
export async function createNeed(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/signup?next=/needs/new");
  if (user.role !== "CUSTOMER") {
    throw new Error("Only client accounts can post a need.");
  }

  const industryId = String(formData.get("industryId") ?? "");
  const subSpecialtyId = String(formData.get("subSpecialtyId") ?? "");
  const problemArea = String(formData.get("problemArea") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  if (!industryId || !problemArea || !description) {
    throw new Error("Industry, challenge, and description are required.");
  }

  // If a sub-specialty was chosen, record the most specific taxonomy node.
  const resolvedIndustryId = subSpecialtyId || industryId;

  // The profile is created HERE, from the industry they just picked, rather than
  // at booking time from the local part of their email address. First-time
  // clients get real data; returning ones keep theirs unless they retype it.
  const profile = await prisma.customerProfile.upsert({
    where: { userId: user.id },
    update: businessName ? { businessName } : {},
    create: {
      userId: user.id,
      businessName: businessName || displayName(user),
      industryId: resolvedIndustryId,
    },
  });

  const need = await prisma.need.create({
    data: {
      customerId: profile.id,
      industryId: resolvedIndustryId,
      problemArea,
      description,
      status: "open",
    },
  });

  // Ops alert — nothing else tells them a need is waiting, and the queue is a
  // pull-only screen. Fail-soft like every other dispatcher, and awaited BEFORE
  // the redirect below, which throws by design.
  await notifyNeedPosted(need.id);

  redirect(`/needs/${need.id}/matches`);
}
