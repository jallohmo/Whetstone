// Screen 18 — Dispute/flag resolution view.
// Messaging history + booking details together for fast resolution. RLS: disputes
// readable/writable by OPS_ADMIN, plus read-only for the two parties involved.
export default function OpsDisputePage({
  params,
}: {
  params: { disputeId: string };
}) {
  return (
    <div className="grid max-w-5xl gap-4 lg:grid-cols-2">
      <section className="rounded-md border border-gray-300 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">Booking</h2>
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-gray-500">Dispute</dt><dd className="font-mono">{params.disputeId}</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Booking</dt><dd className="font-mono">bk_9</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd>Disputed</dd></div>
          <div className="flex justify-between"><dt className="text-gray-500">Package</dt><dd>Single session</dd></div>
        </dl>
        <div className="mt-4 flex gap-2">
          <button className="rounded-sm bg-green-700 px-3 py-1.5 text-[13px] font-semibold text-white">Resolve</button>
          <button className="rounded-sm bg-red-700 px-3 py-1.5 text-[13px] font-semibold text-white">Escalate</button>
        </div>
      </section>

      <section className="rounded-md border border-gray-300 bg-white p-4">
        <h2 className="mb-3 text-sm font-bold text-ink">Message history</h2>
        <div className="flex flex-col gap-2 text-[13px]">
          <div className="max-w-[85%] self-start rounded-sm bg-gray-100 px-2.5 py-1.5">The advice didn&apos;t cover what I asked about.</div>
          <div className="max-w-[85%] self-end rounded-sm bg-ink px-2.5 py-1.5 text-white">Happy to do a follow-up to close the gap.</div>
        </div>
      </section>
    </div>
  );
}
