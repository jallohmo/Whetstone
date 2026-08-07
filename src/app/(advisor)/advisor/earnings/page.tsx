import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/ui";
import { Money } from "@/components/shared/Money";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitCommission } from "@/lib/currency";
import { stripeEnabled } from "@/lib/stripe";
import { startPayoutOnboarding } from "@/lib/actions/connect";

// Screen 14 — Payout/earnings view (A6). Real payments: what's held, what's
// released, and the payout status. Amounts respect each booking's currency.
export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/earnings");

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, stripeAccountId: true },
  });
  if (!profile) redirect("/advisor/apply");

  const payments = await prisma.payment.findMany({
    where: { booking: { advisorId: profile.id } },
    orderBy: { booking: { createdAt: "desc" } },
    include: { booking: { select: { id: true, createdAt: true } } },
  });

  // Payout = gross minus commission. Group by held vs released.
  const rows = payments.map((p) => ({
    id: p.id,
    bookingId: p.bookingId,
    currency: p.currency,
    payout: splitCommission(p.amountCents).advisorPayoutMinor,
    status: p.status,
  }));
  // Sum "coming your way" per currency (held only).
  const pendingByCcy = new Map<string, number>();
  for (const r of rows) {
    if (r.status === "held") pendingByCcy.set(r.currency, (pendingByCcy.get(r.currency) ?? 0) + r.payout);
  }

  return (
    <div>
      <PageHeader title="Earnings" />

      {/* Payout setup */}
      {stripeEnabled && !profile.stripeAccountId && (
        <Card className="mb-page-gap border-amber-500/40 bg-amber-100">
          <p className="text-body text-amber-700">
            Set up payouts to receive money for your sessions.
          </p>
          <form action={startPayoutOnboarding} className="mt-3">
            <Button type="submit">Set up payouts</Button>
          </form>
        </Card>
      )}
      {stripeEnabled && profile.stripeAccountId && (
        <p className="mb-page-gap flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 size={16} /> Payouts connected.
        </p>
      )}

      {/* Coming your way */}
      <Card className="mb-page-gap">
        <p className="text-sm text-gray-500">Coming your way</p>
        {pendingByCcy.size === 0 ? (
          <p className="mt-1 text-display3 text-ink">
            <Money amountMinor={0} currency="USD" />
          </p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-4">
            {[...pendingByCcy.entries()].map(([ccy, amt]) => (
              <span key={ccy} className="text-display3 text-ink">
                <Money amountMinor={amt} currency={ccy} />
              </span>
            ))}
          </div>
        )}
        <p className="mt-1 text-sm text-gray-500">Released to you after each session completes.</p>
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
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 py-6 text-gray-500">No payments yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-sm">{r.bookingId.slice(0, 10)}…</td>
                  <td className="px-4 py-3"><Money amountMinor={r.payout} currency={r.currency} /></td>
                  <td className="px-4 py-3 text-sm">
                    <span className={r.status === "released" ? "text-green-700" : r.status === "refunded" ? "text-red-700" : "text-gray-500"}>
                      {r.status === "held" ? "Held (releases after session)" : r.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
