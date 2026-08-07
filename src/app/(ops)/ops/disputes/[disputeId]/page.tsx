import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveDispute } from "@/lib/actions/disputes";
import { Money } from "@/components/shared/Money";

// Screen 18 — Dispute/flag resolution. Booking details + full message history
// together for fast resolution. OPS only (route group is gated).
export const dynamic = "force-dynamic";

export default async function OpsDisputePage({
  params,
}: {
  params: { disputeId: string };
}) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: params.disputeId },
    include: {
      booking: {
        include: {
          customer: { include: { user: true } },
          advisor: { include: { user: true } },
          messages: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!dispute) notFound();

  const b = dispute.booking;
  const resolved = dispute.status === "resolved";

  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
      <section className="rounded-md border border-gray-300 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Booking</h2>
          <span className={`rounded-xs px-1.5 py-0.5 text-2xs font-semibold uppercase ${
            resolved ? "bg-green-100 text-green-700" : dispute.status === "escalated" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
          }`}>
            {dispute.status}
          </span>
        </div>
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-gray-500">Customer</dt><dd>{b.customer.user.email}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Advisor</dt><dd>{b.advisor.user.email}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Booking</dt><dd className="font-mono">{b.id}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Amount</dt><dd><Money amountMinor={b.priceCents} currency={b.currency} /></dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Raised by</dt><dd className="font-mono">{dispute.raisedBy.slice(0, 12)}…</dd></div>
        </dl>
        <div className="mt-3 rounded-sm bg-gray-50 p-2 text-[13px] whitespace-pre-wrap text-gray-700">{dispute.notes}</div>

        {!resolved && dispute.status !== "escalated" ? (
          <form action={resolveDispute} className="mt-4">
            <input type="hidden" name="disputeId" value={dispute.id} />
            <textarea name="note" rows={2} placeholder="Resolution note (optional)" className="mb-2 w-full rounded-sm border border-gray-300 px-2 py-1.5 text-[13px] outline-none focus:border-ink" />
            <div className="flex gap-2">
              <button name="action" value="resolve" className="rounded-sm bg-green-700 px-3 py-1.5 text-[13px] font-semibold text-white">Resolve</button>
              <button name="action" value="escalate" className="rounded-sm bg-amber-700 px-3 py-1.5 text-[13px] font-semibold text-white">Escalate</button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-[13px] text-gray-500">
            {resolved ? "This dispute is resolved." : "Escalated — handle out of band."}
          </p>
        )}
      </section>

      <section className="rounded-md border border-gray-300 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">Message history</h2>
        {b.messages.length === 0 ? (
          <p className="text-[13px] text-gray-500">No messages on this booking.</p>
        ) : (
          <div className="flex flex-col gap-2 text-[13px]">
            {b.messages.map((m) => {
              const fromCustomer = m.senderId === b.customer.userId;
              return (
                <div key={m.id} className={`max-w-[85%] rounded-sm px-2.5 py-1.5 ${fromCustomer ? "self-start bg-gray-100" : "self-end bg-ink text-white"}`}>
                  {m.body}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
