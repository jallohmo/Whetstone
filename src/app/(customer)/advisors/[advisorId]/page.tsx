import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Card } from "@/components/ui";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { ReviewSummary } from "@/components/shared/ReviewSummary";
import { RelevanceExplainer } from "@/components/shared/RelevanceExplainer";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";
import { prisma } from "@/lib/prisma";

// Screen 4 — Advisor profile view (A1). Credibility-forward. Only VERIFIED
// advisors are shown publicly (also enforced by RLS on advisor_profiles).
export default async function AdvisorProfilePage({
  params,
  searchParams,
}: {
  params: { advisorId: string };
  searchParams: { needId?: string };
}) {
  const advisor = await prisma.advisorProfile.findUnique({
    where: { id: params.advisorId },
    include: {
      user: true,
      specialtyTags: true,
      bookings: { include: { review: true } },
    },
  });

  if (!advisor || advisor.verificationStatus !== "VERIFIED") notFound();

  const ratings = advisor.bookings
    .map((b) => b.review?.rating)
    .filter((r): r is number => typeof r === "number");
  const avg = ratings.length
    ? ratings.reduce((s, r) => s + r, 0) / ratings.length
    : null;

  const bookHref = `/bookings/new?advisorId=${advisor.id}${
    searchParams.needId ? `&needId=${searchParams.needId}` : ""
  }`;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Advisor profile" />
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-h2 text-ink">{advisor.user.email.split("@")[0]}</h2>
            <p className="mt-1 text-body text-gray-500">
              {advisor.yearsExperience} years&apos; experience
            </p>
            <div className="mt-2">
              <ReviewSummary rating={avg} count={ratings.length} />
            </div>
          </div>
          <VerificationBadge status={advisor.verificationStatus} />
        </div>

        {advisor.headline && (
          <div className="mt-4">
            <RelevanceExplainer text={advisor.headline} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {advisor.specialtyTags.map((t) => (
            <IndustryTag key={t.id} name={t.name} variant="specialty" />
          ))}
        </div>

        <p className="mt-5 border-t border-dashed border-gray-300 pt-4 text-body text-gray-700">
          {advisor.bio}
        </p>

        <div className="mt-5">
          <InsuranceCoverageNotice />
        </div>

        <div className="mt-6">
          <Link
            href={bookHref}
            className="inline-flex rounded-md bg-ink px-6 py-3 text-body font-semibold text-white shadow-ink-glow"
          >
            Book a session
          </Link>
        </div>
      </Card>
    </div>
  );
}
