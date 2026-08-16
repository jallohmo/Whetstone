import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Check, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui";
import { BookingStepper } from "@/components/ui/BookingStepper";
import { Avatar } from "@/components/ui/Avatar";
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
    <div className="mx-auto max-w-[640px]">
      <div className="mb-8">
        <BookingStepper current="done" />
      </div>

      {/* Success hero */}
      <div className="mb-6 text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-pill bg-green-100 text-green-700">
          <Check size={30} strokeWidth={3} />
        </span>
        <h1 className="mt-4 text-h1 text-ink">You&apos;re booked in</h1>
        <p className="mx-auto mt-2 max-w-md text-body text-gray-600">
          Come with your actual business challenge — that&apos;s what this is for. You&apos;ll get a
          reminder and a video link before the session.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <Avatar name={advisorName} src={booking.advisor.avatarUrl} gradient="brand" size={52} />
          <div>
            <p className="text-body font-semibold text-ink">Session with {advisorName}</p>
            {when && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
                <Calendar size={14} strokeWidth={2} />
                {when}
              </p>
            )}
          </div>
        </div>

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

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/bookings/${booking.id}/messages`}
            className="inline-flex items-center gap-2 rounded-md bg-ink px-5 py-3 text-body font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px"
          >
            <MessageCircle size={17} strokeWidth={2} />
            Message your advisor
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-gray-200 bg-white px-5 py-3 text-body font-semibold text-ink transition duration-DEFAULT ease-soft hover:border-gray-300"
          >
            Back home
          </Link>
        </div>
      </Card>
    </div>
  );
}
