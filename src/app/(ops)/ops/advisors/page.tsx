import Link from "next/link";
import { VerificationBadge } from "@/components/shared/VerificationBadge";

// Ops: advisor applications awaiting review (entry to Screen 17).
export default function OpsAdvisorsPage() {
  const advisors = [
    { id: "adv_sample", name: "A. Advisor", industry: "Manufacturing", status: "PENDING" as const },
    { id: "adv_two", name: "B. Advisor", industry: "Finance", status: "NEEDS_MORE_INFO" as const },
  ];
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Advisor verification</h1>
      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-300 bg-gray-50 text-left text-2xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Advisor</th>
              <th className="px-3 py-2 font-semibold">Industry</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {advisors.map((a) => (
              <tr key={a.id} className="border-b border-gray-150 hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-ink">{a.name}</td>
                <td className="px-3 py-2 text-gray-500">{a.industry}</td>
                <td className="px-3 py-2">
                  <VerificationBadge status={a.status} size="sm" />
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/ops/advisors/${a.id}/verify`} className="font-semibold text-brand-blue hover:underline">
                    Review →
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
