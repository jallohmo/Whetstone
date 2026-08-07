import Link from "next/link";
import { PageHeader, Card, ScaffoldNote } from "@/components/ui";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { RelevanceExplainer } from "@/components/shared/RelevanceExplainer";
import { ReviewSummary } from "@/components/shared/ReviewSummary";
import { IndustryTag } from "@/components/shared/IndustryTag";

// Screen 3 — Matched-advisor view (A3 outcome).
// A small number of CURATED, verified options — not an infinite directory.
// Each option leads with a RelevanceExplainer so relevance is obvious at a glance.
export default function MatchesPage({ params }: { params: { needId: string } }) {
  // Sample shape only — real matches come from ops MatchDecision for this need.
  const sample = [
    {
      id: "adv_sample",
      name: "A. Advisor",
      headline: "Former operations director",
      relevance: "18 years running regional manufacturing operations; now advises SMEs on cash flow and supplier terms.",
      tags: ["Manufacturing", "Cash flow"],
      rating: 4.9,
      reviews: 27,
    },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="People who can help"
        subtitle="A short, curated shortlist — each matched to your situation by our team, not an algorithm."
      />
      <div className="flex flex-col gap-list-rhythm">
        {sample.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-h3 text-ink">{a.name}</h3>
                <p className="text-sm text-gray-500">{a.headline}</p>
              </div>
              <VerificationBadge status="VERIFIED" size="sm" />
            </div>
            <div className="mt-3">
              <RelevanceExplainer text={a.relevance} />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {a.tags.map((t) => (
                <IndustryTag key={t} name={t} variant="specialty" />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-300 pt-4">
              <ReviewSummary rating={a.rating} count={a.reviews} />
              <Link
                href={`/advisors/${a.id}?needId=${params.needId}`}
                className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink-glow"
              >
                View profile
              </Link>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <ScaffoldNote>
          Matches for need <code className="font-mono">{params.needId}</code> are produced by ops via
          the manual matching tool (Screen 16) and read from <code className="font-mono">MatchDecision</code>.
          Wire the query at build time.
        </ScaffoldNote>
      </div>
    </div>
  );
}
