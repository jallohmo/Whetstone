import { MatchingWorkbench } from "@/components/ops/MatchingWorkbench";

// Screen 16 — Manual matching tool (A3).
export default function OpsMatchPage({ params }: { params: { needId: string } }) {
  // Candidates come from a filtered AdvisorProfile query (VERIFIED, specialty overlap).
  const candidates = [
    { id: "adv_sample", name: "A. Advisor", headline: "Former operations director", specialties: ["Manufacturing", "Cash flow"] },
    { id: "adv_two", name: "B. Advisor", headline: "Retired CFO", specialties: ["Finance", "Cash flow"] },
  ];

  return (
    <div>
      <h1 className="mb-1 text-lg font-bold text-ink">Match need</h1>
      <p className="mb-4 text-gray-500">
        Cash-flow problem · Manufacturing SME · need{" "}
        <span className="font-mono">{params.needId}</span>
      </p>
      <MatchingWorkbench needId={params.needId} candidates={candidates} />
    </div>
  );
}
