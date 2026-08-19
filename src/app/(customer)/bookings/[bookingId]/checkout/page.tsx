import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarX2, Clock, Lock } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/ui";
import { BookingStepper } from "@/components/ui/BookingStepper";
import { Avatar } from "@/components/ui/Avatar";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";
import { createCheckout } from "@/lib/actions/payments";
import { stripeEnabled } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { platformFormat } from "@/lib/time";
import { checkoutReadiness, isResumedCheckout, paymentExpiryDeadline } from "@/lib/booking-status";

// Screen 6 — Payment/checkout (A6). Insurance coverage is visible here, not
// buried. createCheckout creates the held Payment, sets the coverage flag, and
// only then advances the booking to "confirmed".
//
// Serves two arrivals, told apart by how old the booking is (isResumedCheckout):
// the funnel, seconds after picking a slot, and a return from the reminder email
// or the bookings list days later. The returning client gets no stepper (there
// is no journey behind them), the deadline their booking is held to, and copy
// that leads with "not confirmed yet" instead of a receipt's reassurance.
export const dynamic = "force-dynamic";

const dateTime = platformFormat({
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

export default async function CheckoutPage({
  params,
}: {
  params: { bookingId: string };
}) {
  // Middleware only guarantees a session on /bookings/*, not that this booking
  // belongs to the person holding it. Without the ownership check below, any
  // signed-in user could read any booking's advisor, scope and price by id.
  const user = await getCurrentUser();
  if (!user) redirect(`/signup?next=/bookings/${params.bookingId}/checkout`);

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      customer: { select: { userId: true } },
      advisor: { include: { user: true } },
      sessions: { orderBy: { scheduledAt: "asc" }, take: 1 },
    },
  });
  if (!booking) notFound();

  // Paying is the client's alone — not the advisor's, and not ops'. notFound()
  // rather than a 403 so this doesn't confirm that a given booking id exists.
  if (booking.customer.userId !== user.id) notFound();

  const now = new Date();
  const advisorName = booking.advisor.user.email.split("@")[0];
  const firstSession = booking.sessions[0];
  const when = firstSession ? dateTime.format(firstSession.scheduledAt) : null;

  const resumed = isResumedCheckout(booking.createdAt, now);
  const readiness = checkoutReadiness(
    booking.status,
    booking.createdAt,
    firstSession?.scheduledAt ?? null,
    now,
  );

  // An already-paid booking has somewhere better to be than a refusal screen.
  if (readiness.kind === "not_payable") redirect(`/bookings/${booking.id}/confirmed`);

  return (
    <div className="mx-auto max-w-2xl">
      {/* The stepper is the funnel's progress bar. Someone returning to an
          abandoned booking has no steps behind them and none ahead, so showing
          it claims a journey that isn't happening. */}
      {!resumed && (
        <div className="mb-8">
          <BookingStepper current="book" />
        </div>
      )}

      <PageHeader
        title={resumed ? "Complete your booking" : "Checkout"}
        subtitle={
          resumed
            ? "This booking isn't confirmed until it's paid for."
            : "Payment is held securely and only released after your session."
        }
      />

      {readiness.ready ? (
        <>
          <div className="mb-page-gap">
            <InsuranceCoverageNotice />
          </div>

          {/* The reminder email promises a deadline; this is where they land
              after reading it, so the same deadline has to be here too. */}
          {resumed && (
            <Card className="mb-page-gap flex items-center gap-3 border-brand-blue/30 bg-brand-blue/5 py-4">
              <Clock size={18} strokeWidth={2} className="shrink-0 text-brand-blue" />
              <span className="text-body text-gray-600">
                We&apos;re holding this until{" "}
                <strong className="font-semibold text-ink">
                  {dateTime.format(paymentExpiryDeadline(booking.createdAt))}
                </strong>
                . After that it&apos;s released and the time goes back to your advisor.
              </span>
            </Card>
          )}

          <Card>
            <div className="mb-5 flex items-center gap-3 border-b border-dashed border-gray-300 pb-5">
              <Avatar name={advisorName} src={booking.advisor.avatarUrl} gradient="brand" size={44} />
              <div>
                <p className="text-body font-semibold text-ink">
                  {booking.sessionCount === 1 ? "Single session" : `${booking.sessionCount} sessions`} with {advisorName}
                </p>
                {when && (
                  <p className="text-sm text-gray-500">{when} · 60 minutes</p>
                )}
              </div>
            </div>

            <BoundedScopeSummary
              sessionCount={booking.sessionCount}
              scopeDescription={booking.scopeDescription}
              priceCents={booking.priceCents}
              currency={booking.currency}
            />
            <div className="mt-5 border-t border-dashed border-gray-300 pt-5">
              <p className="text-sm text-gray-500">
                {stripeEnabled
                  ? `You'll pay securely on Stripe in the booking's currency (${booking.currency}). Funds are held and released to your advisor after the session.`
                  : `Payments aren't configured in this environment — confirming records a held payment so you can walk the full flow.`}
              </p>
              <form action={createCheckout} className="mt-4">
                <input type="hidden" name="bookingId" value={booking.id} />
                <Button type="submit" size="lg" className="w-full">
                  <Lock size={16} strokeWidth={2} />
                  {stripeEnabled ? "Continue to secure payment" : "Confirm booking"}
                </Button>
              </form>
            </div>
          </Card>

          <p className="mt-4 text-sm text-gray-400">
            Held on the platform via Stripe, reconciled by the webhook, and released to
            the advisor (minus commission) once you&apos;ve had your session.
          </p>
        </>
      ) : (
        /* Refusing to take the money, and saying why. The old screen would have
           rendered an elapsed session as a normal appointment and charged for
           it — see checkoutReadiness. */
        <Card className="border-gray-300">
          <div className="flex items-start gap-3">
            <CalendarX2 size={20} strokeWidth={2} className="mt-0.5 shrink-0 text-gray-400" />
            <div>
              <p className="text-h3 text-ink">
                {readiness.kind === "session_elapsed"
                  ? "That time has already passed"
                  : "This booking has been held too long"}
              </p>
              <p className="mt-1 text-body text-gray-600">{readiness.reason}</p>
              <p className="mt-3 text-body text-gray-600">
                You haven&apos;t been charged
                {when ? ` for the ${when} session` : ""}. {advisorName} may still have
                other times available.
              </p>
              <Link href={`/advisors/${booking.advisorId}`} className="mt-4 inline-flex">
                <Button>Find another time</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
