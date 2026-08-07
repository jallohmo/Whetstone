import { notFound } from "next/navigation";
import { MatchingWorkbench } from "@/components/ops/MatchingWorkbench";
import { prisma } from "@/lib/prisma";

// Screen 16 — Manual matching tool (A3). Candidates are VERIFIED advisors,
// surfaced with their specialties so ops can judge relevance across sectors.
export default async function OpsMatchPage({
  params,
}: {
  params: { needId: string };
}) {
  const need = await prisma.need.findUnique({
    where: { id: params.needId },
    include: { industry: true },
  });
  if (!need) notFound();

  // Prefer advisors whose specialties overlap the need's industry (or its parent),
  // then fall back to all verified advisors so ops always has options.
  const industryIds = [need.industryId, need.industry.parentId].filter(
    (x): x is string => Boolean(x),
  );

  const [matching, allVerified] = await Promise.all([
    prisma.advisorProfile.findMany({
      where: {
        verificationStatus: "VERIFIED",
        specialtyTags: { some: { id: { in: industryIds } } },
      },
      include: { user: true, specialtyTags: true },
    }),
    prisma.advisorProfile.findMany({
      where: { verificationStatus: "VERIFIED" },
      include: { user: true, specialtyTags: true },
      take: 25,
    }),
  ]);

  const seen = new Set(matching.map((a) => a.id));
  const candidates = [...matching, ...allVerified.filter((a) => !seen.has(a.id))].map(
    (a) => ({
      id: a.id,
      name: a.user.email.split("@")[0],
      headline: a.headline ?? `${a.yearsExperience} years' experience`,
      specialties: a.specialtyTags.map((t) => t.name),
    }),
  );

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink">Match need</h1>
      <p className="mb-4 text-gray-500">
        {need.problemArea} · {need.industry.name} · need{" "}
        <span className="font-mono">{need.id}</span>
      </p>
      <MatchingWorkbench needId={need.id} candidates={candidates} />
    </div>
  );
}
