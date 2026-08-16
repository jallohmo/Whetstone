import { PageHeader, Card } from "@/components/ui";
import { BookingStepper } from "@/components/ui/BookingStepper";
import { redirect } from "next/navigation";
import { NeedIntakeForm } from "@/components/customer/NeedIntakeForm";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { reportError } from "@/lib/observability";

// Reads the taxonomy at request time (and avoids a build-time DB dependency).
export const dynamic = "force-dynamic";

// Screen 2 — Post a need (A2). Signed-in clients only (middleware enforces it).
export default async function NewNeedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signup?next=/needs/new");

  // Taxonomy is data, not hardcoded options. Top-level industries + their children.
  const [roots, profile] = await Promise.all([
    prisma.industryTaxonomy
      .findMany({
        where: { parentId: null },
        orderBy: { name: "asc" },
        include: { children: { orderBy: { name: "asc" } } },
      })
      .catch((err) => {
        // Degrade to an empty selector rather than crashing the page, but surface
        // the real cause in server logs / Sentry — a silently empty dropdown is
        // otherwise indistinguishable from an unreachable DB.
        reportError("NewNeedPage: failed to load industry taxonomy", err);
        return [];
      }),
    prisma.customerProfile.findUnique({
      where: { userId: user.id },
      select: { businessName: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <BookingStepper current="describe" />
      </div>
      <PageHeader
        title="Describe your business challenge"
        subtitle="Tell us what you're dealing with and we'll match you with a few people who've been there."
      />
      <Card>
        <NeedIntakeForm
          industries={roots.map((r) => ({
            id: r.id,
            name: r.name,
            children: r.children.map((c) => ({ id: c.id, name: c.name })),
          }))}
          defaultBusinessName={profile?.businessName ?? null}
        />
      </Card>
    </div>
  );
}
