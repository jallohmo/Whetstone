/**
 * One-off audit for the completion-flow migration. READ ONLY — it prints, it
 * never writes.
 *
 * Before the two-sided completion flow, a booking was only ever completed by the
 * client submitting an optional review, and that same submit released the
 * advisor's payment. Two groups of rows can therefore be stranded:
 *
 *   1. Bookings still "confirmed"/"in_progress" whose sessions are all in the
 *      past. Under the old rules these were waiting forever on a review that was
 *      never coming. Under the new rules the advisor can simply mark them
 *      complete, which starts the client's acceptance clock — so the fix is
 *      usually "tell these advisors", not a data change.
 *
 *   2. Bookings marked "completed" whose payment is somehow still "held". These
 *      are the ones actually owing money.
 *
 * Deliberately not auto-fixing either: releasing funds is not something to do
 * silently from a migration script. Run this, read it, then act.
 *
 *   npx tsx scripts/audit-stuck-bookings.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const money = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(minor / 100);

async function main() {
  const now = new Date();

  const live = await prisma.booking.findMany({
    where: { status: { in: ["confirmed", "in_progress"] } },
    include: {
      sessions: { orderBy: { scheduledAt: "desc" } },
      payment: true,
      review: true,
      advisor: { include: { user: { select: { email: true } } } },
      customer: { select: { businessName: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const stale = live.filter(
    (b) => b.sessions.length > 0 && b.sessions.every((s) => s.scheduledAt < now),
  );

  console.log(`\n=== Live bookings whose sessions have all passed: ${stale.length} ===`);
  console.log("These advisors can now mark the work complete to start the payout.\n");
  for (const b of stale) {
    const last = b.sessions[0]?.scheduledAt;
    const days = last ? Math.floor((now.getTime() - last.getTime()) / 86_400_000) : 0;
    console.log(
      [
        b.id,
        `${days}d since last session`,
        `advisor=${b.advisor.user.email}`,
        `client=${b.customer.businessName}`,
        `payment=${b.payment?.status ?? "none"}`,
        b.review ? "HAS REVIEW (was stuck under the old rules)" : "",
      ]
        .filter(Boolean)
        .join("  |  "),
    );
  }

  const completedButHeld = await prisma.booking.findMany({
    where: { status: "completed", payment: { status: "held" } },
    include: { payment: true, advisor: { include: { user: { select: { email: true } } } } },
  });

  console.log(`\n=== Completed bookings with funds still held: ${completedButHeld.length} ===`);
  console.log("These owe money. Releasing is a deliberate act — do it knowingly.\n");
  let owed = 0;
  for (const b of completedButHeld) {
    if (!b.payment) continue;
    owed += b.payment.amountCents;
    console.log(
      `${b.id}  |  ${money(b.payment.amountCents, b.payment.currency)}  |  advisor=${b.advisor.user.email}`,
    );
  }
  if (completedButHeld.length > 0) {
    console.log(`\nTotal held against completed bookings: ${money(owed, "AUD")} (mixed currencies shown per row)`);
  }

  const awaiting = await prisma.booking.count({ where: { status: "awaiting_confirmation" } });
  console.log(`\n=== Currently awaiting client confirmation: ${awaiting} ===`);
  console.log("The lifecycle cron nudges these at day 3 and accepts at day 7.\n");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
