import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { SessionCall } from "@/components/booking/SessionCall";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prepareSessionCall, type CallDenial } from "@/lib/video";
import { platformFormat } from "@/lib/time";

// Screen 8b — the session video call, in-app. Daily Prebuilt embedded rather
// than a handover to daily.co, so the call keeps our shell and, when it ends,
// drops both parties back into the booking flow.
export const dynamic = "force-dynamic";

const dateTime = platformFormat({
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

/** What to tell someone we couldn't put into the call. */
const DENIAL_COPY: Record<CallDenial, { title: string; body: string }> = {
  "not-found": {
    title: "We couldn't find that session",
    body: "It may have been rescheduled. Check the booking for the current time.",
  },
  forbidden: {
    title: "This call isn't yours to join",
    body: "Only the client and advisor on a booking can join its session.",
  },
  unavailable: {
    title: "Video isn't available right now",
    body: "We couldn't set the call up. Please try again shortly, or message your counterpart to agree another way to talk.",
  },
};

export default async function SessionCallPage({
  params,
}: {
  params: { bookingId: string; sessionId: string };
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/login?next=/bookings/${params.bookingId}/sessions/${params.sessionId}/call`,
    );
  }

  // The session must actually belong to the booking in the URL — otherwise a
  // valid session id under someone else's booking id would render a confusing
  // (if still authorized) screen.
  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    select: { id: true, bookingId: true },
  });
  if (!session || session.bookingId !== params.bookingId) notFound();

  const result = await prepareSessionCall(params.sessionId, user);

  if ("denied" in result) {
    const copy = DENIAL_COPY[result.denied];
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <p className="text-h3 text-ink">{copy.title}</p>
          <p className="mt-2 text-body text-gray-600">{copy.body}</p>
          <Link
            href={`/bookings/${params.bookingId}/messages`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue-600"
          >
            <ArrowLeft size={16} strokeWidth={2} /> Back to the booking
          </Link>
        </Card>
      </div>
    );
  }

  const { call } = result;
  const parties = await prisma.booking.findUnique({
    where: { id: call.bookingId },
    select: {
      advisor: { select: { user: { select: { email: true } } } },
      customer: { select: { user: { select: { email: true } } } },
    },
  });
  const counterpartEmail = call.viewerIsAdvisor
    ? parties?.customer.user.email
    : parties?.advisor.user.email;
  const counterpart = counterpartEmail?.split("@")[0] ?? "your counterpart";

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 text-ink">Session with {counterpart}</h1>
          <p className="mt-1 text-sm text-gray-500">{dateTime.format(call.scheduledAt)}</p>
        </div>
        <Link
          href={`/bookings/${call.bookingId}/messages`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-ink"
        >
          <ArrowLeft size={16} strokeWidth={2} /> Leave and go back
        </Link>
      </div>

      <SessionCall
        roomUrl={call.roomUrl}
        token={call.token}
        bookingId={call.bookingId}
        viewerIsAdvisor={call.viewerIsAdvisor}
      />

      <p className="mt-3 text-sm text-gray-500">
        {call.viewerIsAdvisor
          ? "When you're done, end the call and record how the session went on the booking thread."
          : "Keep anything you agree here in the booking thread too, so it stays on the record."}
      </p>
    </div>
  );
}
