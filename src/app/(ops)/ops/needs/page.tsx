import Link from "next/link";

// Ops: open needs list (entry to the matching workbench, Screen 16).
export default function OpsNeedsPage() {
  const needs = [
    { id: "need_sample", industry: "Manufacturing", problem: "Cash-flow problem", age: "2h" },
  ];
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Open needs</h1>
      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-300 bg-gray-50 text-left text-2xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Need</th>
              <th className="px-3 py-2 font-semibold">Industry</th>
              <th className="px-3 py-2 font-semibold">Age</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {needs.map((n) => (
              <tr key={n.id} className="border-b border-gray-150 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-ink">{n.problem}</td>
                <td className="px-3 py-2 text-gray-500">{n.industry}</td>
                <td className="px-3 py-2 font-mono text-gray-500">{n.age}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/ops/needs/${n.id}/match`} className="font-semibold text-brand-blue hover:underline">
                    Match →
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
