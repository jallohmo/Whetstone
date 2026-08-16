import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Live list — reflect current DB state, not a build-time snapshot.
export const dynamic = "force-dynamic";

// Ops: open needs list (entry to the matching workbench, Screen 16).
export default async function OpsNeedsPage() {
  // "open" covers both untouched needs and ones with a shortlist part-built:
  // a need only leaves this queue when ops RELEASES it to the client, so the
  // shortlist count below is what tells the two apart.
  const needs = await prisma.need.findMany({
    where: { status: "open" },
    include: {
      industry: true,
      matchDecisions: { select: { advisorChosenId: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Open needs</h1>
      {needs.length === 0 ? (
        <p className="rounded-md border border-gray-300 bg-white px-4 py-6 text-gray-500">
          No open needs right now.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
          <table className="w-full">
            <thead className="border-b border-gray-300 bg-gray-50 text-left text-2xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Need</th>
                <th className="px-3 py-2 font-semibold">Industry</th>
                <th className="px-3 py-2 font-semibold">Shortlist</th>
                <th className="px-3 py-2 font-semibold">Posted</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {needs.map((n) => {
                const shortlisted = new Set(
                  n.matchDecisions.map((m) => m.advisorChosenId),
                ).size;
                return (
                  <tr key={n.id} className="border-b border-gray-150 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-ink">{n.problemArea}</td>
                    <td className="px-3 py-2 text-gray-500">{n.industry.name}</td>
                    <td className="px-3 py-2">
                      {shortlisted === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span className="font-semibold text-amber-700">
                          {shortlisted} ready to send
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-500">
                      {n.createdAt.toISOString().slice(0, 10)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link href={`/ops/needs/${n.id}/match`} className="font-semibold text-brand-blue hover:underline">
                        Match →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
