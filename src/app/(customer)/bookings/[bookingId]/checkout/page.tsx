import { PageHeader, Card, Button, ScaffoldNote } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";

// Screen 6 — Payment/checkout (A6). Trust-signalling: insurance coverage is
// visible here, not buried. Stripe Connect holds funds in the booking currency.
export default function CheckoutPage({
  params,
}: {
  params: { bookingId: string };
}) {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Checkout" subtitle="Payment is held securely and only released after your session." />

      <div className="mb-page-gap">
        <InsuranceCoverageNotice />
      </div>

      <Card>
        <BoundedScopeSummary
          sessionCount={1}
          scopeDescription="One focused 60-minute session on a single defined problem."
          priceCents={12000}
          currency="USD"
        />
        <div className="mt-5 border-t border-dashed border-gray-300 pt-5">
          <p className="text-sm text-gray-500">
            Card details are collected by Stripe. The charge is placed in the booking&apos;s currency
            and held via Stripe Connect until the session completes.
          </p>
          <Button className="mt-4 w-full">Pay and confirm booking</Button>
        </div>
      </Card>

      <div className="mt-6">
        <ScaffoldNote>
          Booking <code className="font-mono">{params.bookingId}</code>. On success, create a Payment
          (status &quot;held&quot;), set <code className="font-mono">insuranceCoverageConfirmed = true</code>,
          then move the booking to &quot;confirmed&quot; (enforced in app logic). Stripe webhook lives at a
          route handler, not a Server Action.
        </ScaffoldNote>
      </div>
    </div>
  );
}
