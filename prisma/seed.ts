/**
 * Seed: the IndustryTaxonomy (industry -> sub-specialty) and a couple of
 * bounded-scope Packages.
 *
 * The taxonomy is the FOUNDATIONAL task per the handover — it touches almost every
 * component, so it's built and seeded as data (never hardcoded options) before any
 * screen that depends on it. Launch scope is ALL INDUSTRIES, so this is deliberately
 * broad rather than a single-vertical beachhead.
 *
 * Run: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Industry -> sub-specialties. Broad, all-industry launch taxonomy.
const TAXONOMY: Record<string, string[]> = {
  "Manufacturing & Production": ["Operations & throughput", "Quality & compliance", "Supply chain & procurement", "Health & safety"],
  "Construction & Trades": ["Estimating & tendering", "Project management", "Regulatory & certification", "Subcontractor management"],
  "Retail & E-commerce": ["Merchandising & buying", "Inventory & fulfilment", "Pricing & margin", "Storefront & online conversion"],
  "Hospitality & Food Service": ["Kitchen & menu operations", "Front-of-house & service", "Licensing & food safety", "Multi-site expansion"],
  "Professional Services": ["Practice management", "Pricing & packaging", "Client acquisition", "Team & delivery"],
  "Healthcare & Care": ["Clinical operations", "Regulatory & accreditation", "Staffing & rostering", "Patient/resident experience"],
  "Technology & Software": ["Product & roadmap", "Engineering delivery", "Go-to-market", "Scaling & hiring"],
  "Finance & Accounting": ["Cash flow & working capital", "Financial controls", "Tax & compliance", "Fundraising & lending"],
  "Agriculture & Primary": ["Farm operations", "Compliance & certification", "Supply agreements", "Succession & transition"],
  "Transport & Logistics": ["Fleet & operations", "Route & cost optimisation", "Compliance & licensing", "Warehousing"],
  "Energy & Utilities": ["Operations & maintenance", "Regulatory & safety", "Sustainability & transition", "Asset management"],
  "Creative & Media": ["Studio operations", "Commercial & rights", "Client & project delivery", "Talent & team"],
  "Education & Training": ["Programme design", "Accreditation & compliance", "Enrolment & growth", "Operations"],
  "Real Estate & Property": ["Development & feasibility", "Property management", "Compliance & leasing", "Investment strategy"],
  "Nonprofit & Social Enterprise": ["Funding & grants", "Governance & compliance", "Programme delivery", "Impact measurement"],
};

const PACKAGES = [
  { name: "Single session", sessionCount: 1, scopeDescription: "One focused 60-minute session on a single defined problem.", priceCents: 12000, currency: "USD" },
  { name: "Three-session engagement", sessionCount: 3, scopeDescription: "Three sessions over four weeks — diagnose, plan, then review.", priceCents: 30000, currency: "USD" },
];

async function main() {
  for (const [industry, specialties] of Object.entries(TAXONOMY)) {
    const parent = await prisma.industryTaxonomy.upsert({
      where: { slug: slugify(industry) },
      update: {},
      create: { name: industry, slug: slugify(industry) },
    });

    for (const specialty of specialties) {
      const slug = `${parent.slug}--${slugify(specialty)}`;
      await prisma.industryTaxonomy.upsert({
        where: { slug },
        update: {},
        create: { name: specialty, slug, parentId: parent.id },
      });
    }
  }

  for (const pkg of PACKAGES) {
    // No natural unique key on name, so guard against re-seeding duplicates.
    const existing = await prisma.package.findFirst({ where: { name: pkg.name } });
    if (!existing) await prisma.package.create({ data: pkg });
  }

  const industries = await prisma.industryTaxonomy.count({ where: { parentId: null } });
  const specialties = await prisma.industryTaxonomy.count({ where: { NOT: { parentId: null } } });
  console.log(`Seeded ${industries} industries, ${specialties} sub-specialties, ${PACKAGES.length} packages.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
