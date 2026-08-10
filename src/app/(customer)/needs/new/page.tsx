import { PageHeader } from "@/components/ui";
import { NeedIntakeForm } from "@/components/customer/NeedIntakeForm";
import { prisma } from "@/lib/prisma";

// Reads the taxonomy at request time (and avoids a build-time DB dependency).
export const dynamic = "force-dynamic";

// Screen 2 — Post a need (A2).
export default async function NewNeedPage() {
  // Taxonomy is data, not hardcoded options. Top-level industries + their children.
  const roots = await prisma.industryTaxonomy
    .findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      include: { children: { orderBy: { name: "asc" } } },
    })
    .catch((err) => {
      // Degrade to an empty selector rather than crashing the page, but surface
      // the real cause in server logs (e.g. Vercel runtime logs) — a silently
      // empty dropdown is otherwise indistinguishable from an unreachable DB.
      console.error("NewNeedPage: failed to load industry taxonomy —", err);
      return [];
    });

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
