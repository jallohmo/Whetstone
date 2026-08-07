import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { RelevanceExplainer } from "@/components/shared/RelevanceExplainer";
import { ReviewSummary } from "@/components/shared/ReviewSummary";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { prisma } from "@/lib/prisma";

// Screen 3 — Matched-advisor view (A3 outcome). A small CURATED shortlist chosen
// by ops (via MatchDecision), not an infinite directory. Before ops has matched,
// the customer sees an honest "we're finding you people" state.
export default async function MatchesPage({
  params,
}: {
  params: { needId: string };
}) {
  const need = await prisma.need.findUnique({
    where: { id: params.needId },
    include: {
      industry: true,
      matchDecisions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!need) notFound();

  // Advisors considered/chosen across all decisions for this need.
  const chosenIds = Array.from(
    new Set(need.matchDecisions.map((m) => m.advisorChosenId)),
  );

  const advisors = chosenIds.length
    ? await prisma.advisorProfile.findMany({
        where: { id: { in: chosenIds } },
        include: {
          specialtyTags: true,
          user: true,
          bookings: { include: { review: true } },
        },
      })
    : [];

  if (advisors.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Finding the right people" />
        <Card className="flex items-start gap-3">
          <Clock className="mt-0.5 shrink-0 text-gray-400" size={20} />
          <div>
            <p className="text-body-lg text-ink">
              We&apos;re matching you by hand — not by algorithm.
            </p>
            <p className="mt-1 text-body text-gray-600">
              Our team is lining up a short list of verified people who&apos;ve
              actually dealt with{" "}
              <span className="font-semibold text-ink">{need.problemArea}</span> in{" "}
              {need.industry.name}. We&apos;ll email you the moment it&apos;s ready.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="People who can help"
        subtitle="A short, curated shortlist — each matched to your situation by our team."
      />
      <div className="flex flex-col gap-list-rhythm">
        {advisors.map((a) => {
          const ratings = a.bookings
            .map((b) => b.review?.rating)
            .filter((r): r is number => typeof r === "number");
          const avg = ratings.length
            ? ratings.reduce((s, r) => s + r, 0) / ratings.length
            : null;
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-h3 text-ink">{a.user.email.split("@")[0]}</h3>
                  <p className="text-sm text-gray-500">
                    {a.yearsExperience} years&apos; experience
                  </p>
                </div>
                <VerificationBadge status={a.verificationStatus} size="sm" />
              </div>
              {a.headline && (
                <div className="mt-3">
                  <RelevanceExplainer text={a.headline} />
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.specialtyTags.map((t) => (
                  <IndustryTag key={t.id} name={t.name} variant="specialty" />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-300 pt-4">
                <ReviewSummary rating={avg} count={ratings.length} />
                <Link
                  href={`/advisors/${a.id}?needId=${need.id}`}
                  className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink-glow"
                >
                  View profile
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
