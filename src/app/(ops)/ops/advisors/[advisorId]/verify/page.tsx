// Screen 17 — Verification review screen (B1, B2).
// ID check result, reference notes, credential evidence in ONE place for a fast
// approve / reject / request-more-info decision. Evidence is internal (RLS:
// verification_records readable by OPS_ADMIN only).
export default function OpsVerifyPage({
  params,
}: {
  params: { advisorId: string };
}) {
  const evidence = [
    { type: "id_check", label: "Identity check", result: "Passed (Stripe Identity)" },
    { type: "reference_call", label: "Reference call", result: "Spoke to former MD — confirmed 18 yrs, strong." },
    { type: "license_check", label: "Credential evidence", result: "Two documents uploaded." },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-lg font-bold text-ink">Verify advisor</h1>
      <p className="mb-4 font-mono text-gray-500">{params.advisorId}</p>

      <div className="mb-4 overflow-hidden rounded-md border border-gray-300 bg-white">
        {evidence.map((e) => (
          <div key={e.type} className="flex items-start gap-4 border-b border-gray-150 px-4 py-3 last:border-0">
            <span className="w-40 shrink-0 text-2xs font-semibold uppercase tracking-wide text-gray-500">
              {e.label}
            </span>
            <span className="text-ink">{e.result}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button className="rounded-sm bg-green-700 px-4 py-2 text-[13px] font-semibold text-white">Approve</button>
        <button className="rounded-sm bg-amber-700 px-4 py-2 text-[13px] font-semibold text-white">Request more info</button>
        <button className="rounded-sm bg-red-700 px-4 py-2 text-[13px] font-semibold text-white">Reject</button>
      </div>
      <p className="mt-3 text-2xs text-gray-500">
        Each decision writes a VerificationRecord (evidence trail per B2) and updates
        AdvisorProfile.verificationStatus. Failed automated checks route here for human review — never auto-rejected.
      </p>
    </div>
  );
}
