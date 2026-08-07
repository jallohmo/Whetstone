import { notFound } from "next/navigation";
import { PageHeader, Card, Button } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";
import { createCheckout } from "@/lib/actions/payments";
import { stripeEnabled } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

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
  });
  if (!booking) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Checkout" subtitle="Payment is held securely and only released after your session." />

      <div className="mb-page-gap">
        <InsuranceCoverageNotice />
      </div>

      <Card>
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
            <Button type="submit" className="w-full">
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
