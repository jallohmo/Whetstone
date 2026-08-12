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
//
// Every industry ends with "Other (not listed)" so an advisor can always self-
// allocate, and a final "Other / Cross-industry" industry catches anything the
// list doesn't name. The free-text `otherSpecialties` field on the application
// captures the detail when "Other" is picked. `OTHER` is appended to each list
// below so the wording stays consistent in one place.
const OTHER = "Other (not listed)";

const TAXONOMY: Record<string, string[]> = {
  "Manufacturing & Production": ["Operations & throughput", "Quality & compliance", "Supply chain & procurement", "Health & safety", "Automation & lean", "Cost reduction", "Product development", "Maintenance & reliability"],
  "Construction & Trades": ["Estimating & tendering", "Project management", "Regulatory & certification", "Subcontractor management", "Contracts & disputes", "WHS & site safety", "Cash flow & retention", "Sustainability & green building"],
  "Retail & E-commerce": ["Merchandising & buying", "Inventory & fulfilment", "Pricing & margin", "Storefront & online conversion", "Marketing & customer acquisition", "Marketplaces & omnichannel", "Loyalty & retention", "International expansion"],
  "Hospitality & Food Service": ["Kitchen & menu operations", "Front-of-house & service", "Licensing & food safety", "Multi-site expansion", "Cost & margin control", "Staffing & culture", "Marketing & bookings", "Franchising"],
  "Professional Services": ["Practice management", "Pricing & packaging", "Client acquisition", "Team & delivery", "Operations & systems", "Partnerships & M&A", "Marketing & brand", "Succession & exit"],
  "Healthcare & Care": ["Clinical operations", "Regulatory & accreditation", "Staffing & rostering", "Patient/resident experience", "Funding & billing", "Quality & clinical risk", "Growth & new services", "Digital health & records"],
  "Technology & Software": ["Product & roadmap", "Engineering delivery", "Go-to-market", "Scaling & hiring", "Fundraising & finance", "Security & compliance", "Customer success & retention", "Data & AI"],
  "Finance & Accounting": ["Cash flow & working capital", "Financial controls", "Tax & compliance", "Fundraising & lending", "Systems & automation", "Reporting & forecasting", "M&A & exit", "Payroll & bookkeeping"],
  "Agriculture & Primary": ["Farm operations", "Compliance & certification", "Supply agreements", "Succession & transition", "Sustainability & environment", "Diversification & value-add", "Labour & workforce", "Water & land management"],
  "Transport & Logistics": ["Fleet & operations", "Route & cost optimisation", "Compliance & licensing", "Warehousing", "Technology & tracking", "Safety & fatigue management", "Customer & contracts", "Last-mile & delivery"],
  "Energy & Utilities": ["Operations & maintenance", "Regulatory & safety", "Sustainability & transition", "Asset management", "Project delivery", "Commercial & pricing", "Grid & network", "Renewables & storage"],
  "Creative & Media": ["Studio operations", "Commercial & rights", "Client & project delivery", "Talent & team", "Marketing & audience", "Finance & pricing", "IP & licensing", "Digital & content strategy"],
  "Education & Training": ["Programme design", "Accreditation & compliance", "Enrolment & growth", "Operations", "Curriculum & delivery", "Digital & online learning", "Funding & partnerships", "Student experience"],
  "Real Estate & Property": ["Development & feasibility", "Property management", "Compliance & leasing", "Investment strategy", "Financing & capital", "Sales & marketing", "Sustainability & ESG", "Facilities & operations"],
  "Nonprofit & Social Enterprise": ["Funding & grants", "Governance & compliance", "Programme delivery", "Impact measurement", "Fundraising & development", "Volunteer & workforce", "Strategy & scaling", "Partnerships & advocacy"],
  "Other / Cross-industry": ["Strategy & leadership", "Finance & funding", "Sales & marketing", "People & culture", "Operations & systems", "Legal & compliance", "Digital & technology", "Turnaround & exit"],
};

const PACKAGES = [
  { name: "Single session", sessionCount: 1, scopeDescription: "One focused 60-minute session on a single defined problem.", priceCents: 12000, currency: "AUD" },
  { name: "Three-session engagement", sessionCount: 3, scopeDescription: "Three sessions over four weeks — diagnose, plan, then review.", priceCents: 30000, currency: "AUD" },
];

async function main() {
  for (const [industry, specialties] of Object.entries(TAXONOMY)) {
    const parent = await prisma.industryTaxonomy.upsert({
      where: { slug: slugify(industry) },
      update: {},
      create: { name: industry, slug: slugify(industry) },
    });

    // "Other (not listed)" is appended to every industry so an advisor is never
    // stuck without a selectable capability.
    for (const specialty of [...specialties, OTHER]) {
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
