import { redirect } from "next/navigation";
import { Check, CheckCircle2, Clock } from "lucide-react";
import { PageHeader, Card, Button, Eyebrow } from "@/components/ui";
import { Money } from "@/components/shared/Money";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payoutRowDate } from "@/lib/dashboard";
import { platformFormat } from "@/lib/time";
import { splitCommission, DEFAULT_CURRENCY } from "@/lib/currency";
import { stripeEnabled } from "@/lib/stripe";
import { startPayoutOnboarding } from "@/lib/actions/connect";

// Screen 14 — Payout/earnings view (A6). Real payments: what's held, what's
// released, and the payout status. Amounts respect each booking's currency.
//
// Rows are filed under WHO and WHEN. The table used to print a truncated
// booking cuid and nothing else human-readable, so with a flat package price
// every row read "A$102.00" against an opaque id — three identical lines an
// advisor could not tell apart, let alone reconcile against a bank statement.
// The date was already being fetched to sort by and simply never rendered.
export const dynamic = "force-dynamic";

const rowDate = platformFormat({ day: "numeric", month: "short", year: "numeric" });

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
      include: {
        booking: {
          select: {
            id: true,
            createdAt: true,
            scopeDescription: true,
            need: { select: { problemArea: true } },
            sessions: { orderBy: { scheduledAt: "asc" }, take: 1, select: { scheduledAt: true } },
            customer: {
              select: {
                businessName: true,
                user: { select: { firstName: true, lastName: true, fullName: true, email: true } },
              },
            },
          },
        },
      },
    }),
  ]);
  if (!profile) redirect("/advisor/apply");

  // Payout = gross minus commission. Group by held vs released.
  const rows = payments
    .map((p) => ({
      id: p.id,
      currency: p.currency,
      payout: splitCommission(p.amountCents).advisorPayoutMinor,
      status: p.status,
      business: p.booking.customer.businessName,
      person: displayName(p.booking.customer.user),
      topic: p.booking.need?.problemArea ?? p.booking.scopeDescription,
      scheduledAt: p.booking.sessions[0]?.scheduledAt ?? null,
      // Sorted here rather than in the query: the session date lives on a
      // related row, and "most recent work first" is the order an advisor
      // reconciles in.
      at: payoutRowDate(p.booking.sessions[0]?.scheduledAt ?? null, p.booking.createdAt),
    }))
    .sort((a, b) => b.at.getTime() - a.at.getTime());

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
        {/* Held funds, in the brand's pale blue rather than solid ink. It still
            reads as the hero next to the plain white "Released to date" card,
            and the blue/green pair now carries meaning: blue is money waiting,
            green is money paid. Solid black was heavier than a pending balance
            warrants. */}
        <div className="rounded-xl border border-brand-blue/15 bg-brand-blue-100 p-card text-ink shadow-card">
          <Eyebrow tone="blue">Coming your way</Eyebrow>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-4">
            {pendingByCcy.size === 0 ? (
              <Money amountMinor={0} currency={DEFAULT_CURRENCY} className="text-[40px] font-bold tracking-[-0.02em]" />
            ) : (
              [...pendingByCcy.entries()].map(([ccy, amt]) => (
                <Money key={ccy} amountMinor={amt} currency={ccy} className="text-[40px] font-bold tracking-[-0.02em]" />
              ))
            )}
          </div>
          <p className="mt-2 text-sm text-gray-600">
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
              <th className="px-5 py-3 font-semibold">Client</th>
              <th className="px-5 py-3 font-semibold">Session</th>
              <th className="px-5 py-3 font-semibold">Your payout</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-5 py-6 text-gray-500">No payments yet.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0">
                  {/* The business is what an advisor recognises on an invoice;
                      the person underneath is who they actually met. For a sole
                      trader the two are often the same, so it is only shown
                      when it adds something. */}
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-ink">{r.business || r.person}</p>
                    {r.business && r.person !== r.business && (
                      <p className="text-sm text-gray-500">{r.person}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="ws-mono text-sm text-gray-600">
                      {r.scheduledAt ? rowDate.format(r.scheduledAt) : "Not scheduled yet"}
                    </p>
                    <p className="max-w-[22ch] truncate text-sm text-gray-500" title={r.topic}>
                      {r.topic}
                    </p>
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
