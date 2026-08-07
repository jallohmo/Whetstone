import { PageHeader, Card } from "@/components/ui";
import { Money } from "@/components/shared/Money";
import { splitCommission } from "@/lib/currency";

// Screen 14 — Payout/earnings view (A6). Simple, transparent: what's owed and
// when. Amounts respect the booking currency (multi-currency throughout).
export default function EarningsPage() {
  const payouts = [
    { id: "p1", booking: "bk_1", grossCents: 12000, currency: "USD", status: "released", when: "Paid 12 Jul" },
    { id: "p2", booking: "bk_2", grossCents: 30000, currency: "USD", status: "held", when: "Releases after session" },
  ];
  const pendingCents = payouts
    .filter((p) => p.status === "held")
    .reduce((sum, p) => sum + splitCommission(p.grossCents).advisorPayoutMinor, 0);

  return (
    <div>
      <PageHeader title="Earnings" />
      <Card className="mb-page-gap">
        <p className="text-sm text-gray-500">Coming your way</p>
        <p className="mt-1 text-display3 text-ink">
          <Money amountMinor={pendingCents} currency="USD" />
        </p>
        <p className="mt-1 text-sm text-gray-500">Released after each session completes.</p>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-body">
          <thead className="border-b border-gray-200 text-left text-sm text-gray-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Booking</th>
              <th className="px-4 py-3 font-semibold">Your payout</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((p) => {
              const { advisorPayoutMinor } = splitCommission(p.grossCents);
              return (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-sm">{p.booking}</td>
                  <td className="px-4 py-3">
                    <Money amountMinor={advisorPayoutMinor} currency={p.currency} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.when}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
