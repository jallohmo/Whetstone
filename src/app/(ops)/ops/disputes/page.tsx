import Link from "next/link";

// Ops: open disputes/flags list (entry to Screen 18).
export default function OpsDisputesPage() {
  const disputes = [
    { id: "dsp_sample", booking: "bk_9", status: "open", raisedBy: "customer" },
  ];
  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-ink">Disputes</h1>
      <div className="overflow-hidden rounded-md border border-gray-300 bg-white">
        <table className="w-full">
          <thead className="border-b border-gray-300 bg-gray-50 text-left text-2xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Dispute</th>
              <th className="px-3 py-2 font-semibold">Booking</th>
              <th className="px-3 py-2 font-semibold">Raised by</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id} className="border-b border-gray-150 hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-ink">{d.id}</td>
                <td className="px-3 py-2 font-mono text-gray-500">{d.booking}</td>
                <td className="px-3 py-2 text-gray-500">{d.raisedBy}</td>
                <td className="px-3 py-2">
                  <span className="rounded-xs bg-red-100 px-1.5 py-0.5 text-2xs font-semibold uppercase text-red-700">
                    {d.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/ops/disputes/${d.id}`} className="font-semibold text-brand-blue hover:underline">
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
