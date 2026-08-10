import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { RelevanceExplainer } from "@/components/shared/RelevanceExplainer";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";
import { Money } from "@/components/shared/Money";
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
  const [advisor, cheapest] = await Promise.all([
    prisma.advisorProfile.findUnique({
      where: { id: params.advisorId },
      include: {
        user: true,
        specialtyTags: true,
        bookings: { include: { review: true } },
      },
    }),
    prisma.package.findFirst({
      where: { active: true },
      orderBy: { priceCents: "asc" },
    }),
  ]);

  if (!advisor || advisor.verificationStatus !== "VERIFIED") notFound();

  const ratings = advisor.bookings
    .map((b) => b.review?.rating)
    .filter((r): r is number => typeof r === "number");
  const avg = ratings.length
    ? ratings.reduce((s, r) => s + r, 0) / ratings.length
    : null;
  const handle = advisor.user.email.split("@")[0];

  const bookHref = `/bookings/new?advisorId=${advisor.id}${
    searchParams.needId ? `&needId=${searchParams.needId}` : ""
  }`;
  const backHref = searchParams.needId
    ? `/needs/${searchParams.needId}/matches`
    : "/";

  return (
    <div className="mx-auto max-w-[720px]">
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-ink"
      >
        <ChevronLeft size={16} strokeWidth={2} />
        Back to matches
      </Link>

      <Card className="overflow-hidden p-0">
        <div className="p-card">
          <div className="flex items-start gap-4">
            <Avatar name={handle} src={advisor.avatarUrl} gradient="brand" size={72} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-h2 text-ink">{handle}</h1>
                  <p className="mt-1 text-body text-gray-500">
                    {advisor.yearsExperience} years&apos; experience
                  </p>
                </div>
                <VerificationBadge status={advisor.verificationStatus} />
              </div>
            </div>
          </div>

          {/* Stat row */}
          <div className="mt-5 flex items-stretch gap-4 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
            <Stat value={`${advisor.yearsExperience}`} label="years" />
            <span className="w-px bg-gray-200" />
            <Stat value={`${advisor.specialtyTags.length}`} label="areas" />
            <span className="w-px bg-gray-200" />
            <Stat value={avg ? avg.toFixed(1) : "—"} label="reviews" />
          </div>

          {advisor.headline && (
            <div className="mt-5">
              <RelevanceExplainer text={advisor.headline} />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {advisor.specialtyTags.map((t) => (
              <IndustryTag key={t.id} name={t.name} variant="specialty" />
            ))}
          </div>

          <p className="mt-5 border-t border-dashed border-gray-300 pt-5 text-body leading-relaxed text-gray-700">
            {advisor.bio}
          </p>

          <div className="mt-5">
            <InsuranceCoverageNotice />
          </div>
        </div>

        {/* Sticky-style footer bar inside the card */}
        <div className="flex items-center justify-between gap-4 border-t border-gray-200 bg-gray-50 px-card py-4">
          <p className="text-body">
            {cheapest ? (
              <>
                <Money
                  amountMinor={cheapest.priceCents}
                  currency={cheapest.currency}
                  className="text-h3 font-semibold text-ink"
                />
                <span className="text-gray-500"> / single session</span>
              </>
            ) : (
              <span className="text-gray-500">Pricing on request</span>
            )}
          </p>
          <Link
            href={bookHref}
            className="inline-flex rounded-md bg-ink px-6 py-3 text-body font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px"
          >
            Book a session
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 text-center">
      <p className="ws-mono text-h2 font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{label}</p>
    </div>
  );
}
