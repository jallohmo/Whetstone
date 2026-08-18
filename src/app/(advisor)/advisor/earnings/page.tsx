import { redirect } from "next/navigation";
import { Check, CheckCircle2, Clock } from "lucide-react";
import { PageHeader, Card, Button, Eyebrow } from "@/components/ui";
import { Money } from "@/components/shared/Money";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitCommission, DEFAULT_CURRENCY } from "@/lib/currency";
import { stripeEnabled } from "@/lib/stripe";
import { startPayoutOnboarding } from "@/lib/actions/connect";

// Screen 14 — Payout/earnings view (A6). Real payments: what's held, what's
// released, and the payout status. Amounts respect each booking's currency.
export const dynamic = "force-dynamic";

export default async function EarningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/earnings");

  // Both queries are keyed off the signed-in user, so they run in parallel
  // rather than waiting on the profile id — one round trip instead of two.
  const [profile, payments] = await Promise.all([
    prisma.advisorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, stripeAccountId: true },
    }),
    prisma.payment.findMany({
      where: { booking: { advisor: { userId: user.id } } },
      orderBy: { booking: { createdAt: "desc" } },
      include: { booking: { select: { id: true, createdAt: true } } },
    }),
  ]);
  if (!profile) redirect("/advisor/apply");

  // Payout = gross minus commission. Group by held vs released.
  const rows = payments.map((p) => ({
    id: p.id,
    bookingId: p.bookingId,
    currency: p.currency,
    payout: splitCommission(p.amountCents).advisorPayoutMinor,
    status: p.status,
  }));

  const pendingByCcy = new Map<string, number>();
  const releasedByCcy = new Map<string, number>();
  let releasedCount = 0;
  for (const r of rows) {
    if (r.status === "held") pendingByCcy.set(r.currency, (pendingByCcy.get(r.currency) ?? 0) + r.payout);
    if (r.status === "released") {
      releasedByCcy.set(r.currency, (releasedByCcy.get(r.currency) ?? 0) + r.payout);
      releasedCount++;
    }
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

      {/* Top metric grid */}
      <div className="mb-page-gap grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl bg-ink p-card text-white shadow-ink-glow">
          <Eyebrow tone="blue-300">Coming your way</Eyebrow>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4">
            {pendingByCcy.size === 0 ? (
              <Money amountMinor={0} currency={DEFAULT_CURRENCY} className="text-[40px] font-bold tracking-[-0.02em]" />
            ) : (
              [...pendingByCcy.entries()].map(([ccy, amt]) => (
                <Money key={ccy} amountMinor={amt} currency={ccy} className="text-[40px] font-bold tracking-[-0.02em]" />
              ))
            )}
          </div>
          <p className="mt-2 text-sm text-white/60">
            Released to you after each session completes.
          </p>
        </div>

        <Card className="flex flex-col justify-center">
          <p className="text-sm text-gray-500">Released to date</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            {releasedByCcy.size === 0 ? (
              <Money amountMinor={0} currency={DEFAULT_CURRENCY} className="text-display3 font-bold text-green-700" />
            ) : (
              [...releasedByCcy.entries()].map(([ccy, amt]) => (
                <Money key={ccy} amountMinor={amt} currency={ccy} className="text-display3 font-bold text-green-700" />
              ))
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {releasedCount} {releasedCount === 1 ? "session" : "sessions"} completed
          </p>
        </Card>
      </div>

      {/* Payout table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-body">
          <thead className="border-b border-gray-200 text-left text-sm text-gray-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Booking</th>
              <th className="px-5 py-3 font-semibold">Your payout</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-6 text-gray-500">No payments yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  <td className="px-5 py-3.5">
                    <span className="ws-mono text-sm text-gray-600">{r.bookingId.slice(0, 10)}…</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Money amountMinor={r.payout} currency={r.currency} className="font-semibold text-ink" />
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusPill status={r.status} />
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

function StatusPill({ status }: { status: string }) {
  if (status === "released") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-pill bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
        <Check size={13} strokeWidth={2.5} /> Released
      </span>
    );
  }
  if (status === "refunded") {
    return (
      <span className="inline-flex items-center rounded-pill bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        Refunded
      </span>
    );
  }
  // held (and any other pending state)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
      <Clock size={13} strokeWidth={2} /> Held · releases after session
    </span>
  );
}
