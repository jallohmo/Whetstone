import Link from "next/link";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { prisma } from "@/lib/prisma";

// Live list — reflect current DB state, not a build-time snapshot.
export const dynamic = "force-dynamic";

// Ops: advisor applications awaiting review (entry to Screen 17).
export default async function OpsAdvisorsPage() {
  const advisors = await prisma.advisorProfile.findMany({
    where: { verificationStatus: { in: ["PENDING", "NEEDS_MORE_INFO"] } },
    include: { user: true, specialtyTags: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Advisor verification</h1>
      {advisors.length === 0 ? (
        <p className="rounded-md border border-gray-300 bg-white px-4 py-6 text-gray-500">
          No applications awaiting review.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
          <table className="w-full">
            <thead className="border-b border-gray-300 bg-gray-50 text-left text-2xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Advisor</th>
                <th className="px-3 py-2 font-semibold">Specialties</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {advisors.map((a) => (
                <tr key={a.id} className="border-b border-gray-150 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-ink">{a.user.email.split("@")[0]}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {a.specialtyTags.map((t) => t.name).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <VerificationBadge status={a.verificationStatus} size="sm" />
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
      )}
    </div>
  );
}
