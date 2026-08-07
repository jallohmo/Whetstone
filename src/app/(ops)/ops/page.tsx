import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Live ops queue — must reflect current DB state, never a build-time snapshot.
export const dynamic = "force-dynamic";

// Screen 15 — Ops queue dashboard (C1). Dense, scannable: pending advisor
// applications, open (unmatched) customer needs, and open disputes in one list.
type Row = { kind: "application" | "need" | "flag"; label: string; meta: string; href: string };

const kindStyle: Record<Row["kind"], string> = {
  application: "bg-purple-500",
  need: "bg-brand-blue",
  flag: "bg-red-500",
};

export default async function OpsQueuePage() {
  const [applications, needs, disputes] = await Promise.all([
    prisma.advisorProfile.findMany({
      where: { verificationStatus: { in: ["PENDING", "NEEDS_MORE_INFO"] } },
      include: { user: true, specialtyTags: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.need.findMany({
      where: { status: "open" },
      include: { industry: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.dispute.findMany({
      where: { status: { in: ["open", "escalated"] } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const queue: Row[] = [
    ...applications.map((a): Row => ({
      kind: "application",
      label: `${a.user.email.split("@")[0]} — ${a.specialtyTags[0]?.name ?? "Advisor"}`,
      meta: a.verificationStatus === "NEEDS_MORE_INFO" ? "Needs more info" : "Awaiting verification",
      href: `/ops/advisors/${a.id}/verify`,
    })),
    ...needs.map((n): Row => ({
      kind: "need",
      label: `${n.problemArea} — ${n.industry.name}`,
      meta: `Unmatched · ${timeAgo(n.createdAt)}`,
      href: `/ops/needs/${n.id}/match`,
    })),
    ...disputes.map((d): Row => ({
      kind: "flag",
      label: `Dispute on booking ${d.bookingId}`,
      meta: `Raised by ${d.raisedBy}`,
      href: `/ops/disputes/${d.id}`,
    })),
  ];

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Queue</h1>
      {queue.length === 0 ? (
        <p className="rounded-md border border-gray-300 bg-white px-4 py-6 text-gray-500">
          Nothing in the queue. New applications, needs, and flags land here.
        </p>
      ) : (
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
      )}
    </div>
  );
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
