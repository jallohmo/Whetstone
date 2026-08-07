import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { InsuranceCoverageNotice } from "@/components/shared/InsuranceCoverageNotice";
import { prisma } from "@/lib/prisma";

// Screen 7 — Booking confirmation (A4/A6). Plain-spoken copy, prep guidance.
export default async function BookingConfirmedPage({
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
    ? new Intl.DateTimeFormat("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
      }).format(firstSession.scheduledAt)
    : null;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="You're booked in" />
      <Card>
        <p className="flex items-center gap-2 text-body-lg font-semibold text-ink">
          <CheckCircle2 className="text-green-500" size={20} />
          You&apos;re booked in with {advisorName}.
        </p>
        {when && (
          <p className="mt-2 text-body-lg font-semibold text-ink">{when}</p>
        )}
        <p className="mt-2 text-body text-gray-600">
          Come with your actual problem — that&apos;s what this is for. You&apos;ll get a
          reminder and a video link before the session.
        </p>

        <div className="mt-5">
          <BoundedScopeSummary
            sessionCount={booking.sessionCount}
            scopeDescription={booking.scopeDescription}
            priceCents={booking.priceCents}
            currency={booking.currency}
          />
        </div>

        <div className="mt-5">
          <InsuranceCoverageNotice />
        </div>

        <div className="mt-6 flex gap-3">
          <Link href={`/bookings/${booking.id}/messages`} className="rounded-md border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink">
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
