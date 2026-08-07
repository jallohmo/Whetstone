import { notFound } from "next/navigation";
import { PageHeader, Card, Button } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";
import { confirmBooking } from "@/lib/actions/bookings";
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
            Card details are collected by Stripe. The charge is placed in the
            booking&apos;s currency ({booking.currency}) and held via Stripe Connect
            until the session completes.
          </p>
          <form action={confirmBooking} className="mt-4">
            <input type="hidden" name="bookingId" value={booking.id} />
            <Button type="submit" className="w-full">
              Pay and confirm booking
            </Button>
          </form>
        </div>
      </Card>

      <p className="mt-4 text-sm text-gray-400">
        Real card capture wires to Stripe Elements; the held-funds PaymentIntent is
        created here and reconciled by the Stripe webhook route handler.
      </p>
    </div>
  );
}
