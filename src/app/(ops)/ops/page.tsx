import Link from "next/link";

// Screen 15 — Ops queue dashboard (C1). Dense, scannable, keyboard-friendly.
// Pending applications, open needs, flagged issues in one list. Speed over polish.
type Row = { kind: "application" | "need" | "flag"; label: string; meta: string; href: string };

const queue: Row[] = [
  { kind: "application", label: "A. Advisor — Manufacturing", meta: "Awaiting verification", href: "/ops/advisors/adv_sample/verify" },
  { kind: "need", label: "Cash-flow problem — Manufacturing SME", meta: "Unmatched · 2h ago", href: "/ops/needs/need_sample/match" },
  { kind: "flag", label: "Dispute on booking bk_9", meta: "Raised by customer", href: "/ops/disputes/dsp_sample" },
];

const kindStyle: Record<Row["kind"], string> = {
  application: "bg-purple-500",
  need: "bg-brand-blue",
  flag: "bg-red-500",
};

export default function OpsQueuePage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Queue</h1>
      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-300 bg-gray-50 text-left text-2xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Type</th>
              <th className="px-3 py-2 font-semibold">Item</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {queue.map((r, i) => (
              <tr key={i} className="border-b border-gray-150 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className={`inline-block rounded-xs px-1.5 py-0.5 text-2xs font-semibold uppercase text-white ${kindStyle[r.kind]}`}>
                    {r.kind}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium text-ink">{r.label}</td>
                <td className="px-3 py-2 text-gray-500">{r.meta}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={r.href} className="font-semibold text-brand-blue hover:underline">
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
