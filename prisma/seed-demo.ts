/**
 * DEV FIXTURES ONLY — not production data. Creates a handful of VERIFIED advisors
 * (with users + specialties) plus an OPS admin, so the manual matching flow has
 * real candidates to work with locally. Idempotent by email.
 *
 * Run after `npm run db:seed`:  npm run db:seed:demo
 */
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const ADVISORS = [
  {
    email: "rita.ops@whetstone.dev",
    yearsExperience: 18,
    bio: "Spent 18 years running regional manufacturing operations, latterly as ops director across three sites. Now helps SME owners get control of throughput, supplier terms and cash flow.",
    headline: "18 years running regional manufacturing operations; now advises on cash flow, supplier terms and compliance.",
    specialtySlugs: ["manufacturing-and-production--operations-and-throughput", "finance-and-accounting--cash-flow-and-working-capital"],
  },
  {
    email: "george.cfo@whetstone.dev",
    yearsExperience: 25,
    bio: "Retired CFO. 25 years in finance leadership across services and light industrial businesses. Straight-talking on cash flow, controls and lending conversations.",
    headline: "Retired CFO — 25 years on cash flow, financial controls and dealing with lenders.",
    specialtySlugs: ["finance-and-accounting--cash-flow-and-working-capital", "finance-and-accounting--financial-controls"],
  },
  {
    email: "priya.retail@whetstone.dev",
    yearsExperience: 15,
    bio: "Built and sold a regional retail chain. Knows buying, margin, inventory and the real mechanics of opening a second and third site.",
    headline: "Grew and sold a multi-site retail business; advises on margin, inventory and expansion.",
    specialtySlugs: ["retail-and-e-commerce--pricing-and-margin", "retail-and-e-commerce--inventory-and-fulfilment"],
  },
];

async function main() {
  // OPS admin (invite-only in production; created directly here for local dev).
  await prisma.user.upsert({
    where: { email: "ops@whetstone.dev" },
    update: { role: "OPS_ADMIN" },
    create: { id: randomUUID(), email: "ops@whetstone.dev", role: "OPS_ADMIN" },
  });

  for (const a of ADVISORS) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { role: "ADVISOR" },
      create: { id: randomUUID(), email: a.email, role: "ADVISOR" },
    });

    const specialties = await prisma.industryTaxonomy.findMany({
      where: { slug: { in: a.specialtySlugs } },
    });

    const existing = await prisma.advisorProfile.findUnique({ where: { userId: user.id } });
    if (existing) continue;

    await prisma.advisorProfile.create({
      data: {
        userId: user.id,
        bio: a.bio,
        headline: a.headline,
        yearsExperience: a.yearsExperience,
        verificationStatus: "VERIFIED",
        identityCheckPassed: true,
        insuranceCoverageActive: true,
        specialtyTags: { connect: specialties.map((s) => ({ id: s.id })) },
      },
    });
  }

  const verified = await prisma.advisorProfile.count({ where: { verificationStatus: "VERIFIED" } });
  console.log(`Demo fixtures ready: ${verified} verified advisors, 1 ops admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
