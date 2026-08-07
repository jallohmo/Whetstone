"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * A2 — Post a need. Deliberately usable WITHOUT a full account: a need is a
 * "guest need" (customerId null, optional guestEmail) until the customer converts
 * at booking time. Once auth is wired, an authenticated customer's need attaches
 * to their CustomerProfile here instead.
 */
export async function createNeed(formData: FormData) {
  const industryId = String(formData.get("industryId") ?? "");
  const subSpecialtyId = String(formData.get("subSpecialtyId") ?? "");
  const problemArea = String(formData.get("problemArea") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const guestEmail = String(formData.get("guestEmail") ?? "").trim() || null;

  if (!industryId || !problemArea || !description) {
    throw new Error("Industry, problem area, and description are required.");
  }

  // If a sub-specialty was chosen, record the most specific taxonomy node.
  const resolvedIndustryId = subSpecialtyId || industryId;

  const need = await prisma.need.create({
    data: {
      industryId: resolvedIndustryId,
      problemArea,
      description,
      guestEmail,
      status: "open",
    },
  });

  redirect(`/needs/${need.id}/matches`);
}
