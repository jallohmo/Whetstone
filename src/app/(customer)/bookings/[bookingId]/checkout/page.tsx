import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/ui";
import { BookingStepper } from "@/components/ui/BookingStepper";
import { Avatar } from "@/components/ui/Avatar";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";
import { createCheckout } from "@/lib/actions/payments";
import { stripeEnabled } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { platformFormat } from "@/lib/time";

// Screen 6 — Payment/checkout (A6). Insurance coverage is visible here, not
// buried. confirmBooking creates the held Payment, sets the coverage flag, and
// only then advances the booking to "confirmed".
export default async function CheckoutPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      advisor: { include: { user: true } },
      sessions: { orderBy: { scheduledAt: "asc" }, take: 1 },
    },
  });
  if (!booking) notFound();

  const advisorName = booking.advisor.user.email.split("@")[0];
  const firstSession = booking.sessions[0];
  const when = firstSession
    ? platformFormat({
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(firstSession.scheduledAt)
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <BookingStepper current="book" />
      </div>
      <PageHeader
        title="Checkout"
        subtitle="Payment is held securely and only released after your session."
      />

      <div className="mb-page-gap">
        <InsuranceCoverageNotice />
      </div>

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
    </div>
  );
}
