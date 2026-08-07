import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";

// Screen 7 — Booking confirmation (A4/A6). Plain-spoken copy, prep guidance.
export default function BookingConfirmedPage({
  params,
}: {
  params: { bookingId: string };
}) {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="You're booked in" />
      <Card>
        <p className="flex items-center gap-2 text-body-lg font-semibold text-ink">
          <CheckCircle2 className="text-green-500" size={20} />
          You&apos;re booked in with A. Advisor.
        </p>
        <p className="mt-2 text-body text-gray-600">
          Come with your actual problem — that&apos;s what this is for. You&apos;ll get a
          reminder and a video link before the session.
        </p>

        <div className="mt-5">
          <BoundedScopeSummary
            sessionCount={1}
            scopeDescription="One focused 60-minute session on a single defined problem."
          />
        </div>

        <div className="mt-5">
          <InsuranceCoverageNotice />
        </div>

        <div className="mt-6 flex gap-3">
          <Link href={`/bookings/${params.bookingId}/messages`} className="rounded-md border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink">
            Message your advisor
          </Link>
          <Link href="/" className="rounded-md px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100">
            Back home
          </Link>
        </div>
      </Card>
    </div>
  );
}
