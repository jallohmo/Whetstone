import { PageHeader } from "@/components/ui";
import { NeedIntakeForm } from "@/components/customer/NeedIntakeForm";
import { prisma } from "@/lib/prisma";

// Screen 2 — Post a need (A2).
export default async function NewNeedPage() {
  // Taxonomy is data, not hardcoded options. Top-level industries + their children.
  const roots = await prisma.industryTaxonomy
    .findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      include: { children: { orderBy: { name: "asc" } } },
    })
    .catch(() => []); // DB not provisioned yet during scaffold — render empty selector.

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Describe your problem"
        subtitle="Tell us what you're dealing with and we'll match you with a few people who've been there."
      />
      <NeedIntakeForm
        industries={roots.map((r) => ({
          id: r.id,
          name: r.name,
          children: r.children.map((c) => ({ id: c.id, name: c.name })),
        }))}
      />
    </div>
  );
}
