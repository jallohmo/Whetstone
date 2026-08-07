import Link from "next/link";
import { PageHeader, Card, ScaffoldNote } from "@/components/ui";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { ReviewSummary } from "@/components/shared/ReviewSummary";
import { RelevanceExplainer } from "@/components/shared/RelevanceExplainer";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";

// Screen 4 — Advisor profile view (A1). Credibility-forward.
export default function AdvisorProfilePage({
  params,
}: {
  params: { advisorId: string };
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Advisor profile" />
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-h2 text-ink">A. Advisor</h2>
            <p className="mt-1 text-body text-gray-500">
              18 years&apos; experience · Former operations director
            </p>
            <div className="mt-2">
              <ReviewSummary rating={4.9} count={27} />
            </div>
          </div>
          <VerificationBadge status="VERIFIED" />
        </div>

        <div className="mt-4">
          <RelevanceExplainer text="Ran regional manufacturing operations; now advises SMEs on cash flow, supplier terms and compliance." />
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <IndustryTag name="Manufacturing" />
          <IndustryTag name="Cash flow" variant="specialty" />
          <IndustryTag name="Compliance" variant="specialty" />
        </div>

        <div className="mt-5 border-t border-dashed border-gray-300 pt-4 text-body text-gray-600">
          Bio, credentials, and reviews render here from AdvisorProfile,
          VerificationRecord evidence (verified state only), and Review.
        </div>

        <div className="mt-5">
          <InsuranceCoverageNotice />
        </div>

        <div className="mt-6">
          <Link
            href={`/bookings/new?advisorId=${params.advisorId}`}
            className="inline-flex rounded-md bg-ink px-6 py-3 text-body font-semibold text-white shadow-ink-glow"
          >
            Book a session
          </Link>
        </div>
      </Card>
      <div className="mt-6">
        <ScaffoldNote>
          Profile for advisor <code className="font-mono">{params.advisorId}</code>. Only VERIFIED
          advisors are publicly readable (enforced by RLS on <code className="font-mono">advisor_profiles</code>).
        </ScaffoldNote>
      </div>
    </div>
  );
}
