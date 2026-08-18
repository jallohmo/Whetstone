import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Flag, ShieldCheck } from "lucide-react";
import { PageHeader, Card, Button, Textarea } from "@/components/ui";
import { Money } from "@/components/shared/Money";
import { confirmBookingCompletion } from "@/lib/actions/completion";
import { raiseDispute } from "@/lib/actions/disputes";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SESSION_OUTCOME_LABEL,
  COMPLETION_AUTO_ACCEPT_DAYS,
} from "@/lib/booking-status";
import { platformFormat } from "@/lib/time";

/**
 * Client-side completion confirmation. The advisor has marked the work done and
 * this is where the client accepts — the single action that releases the held
 * payment. The other door out of this screen is "something went wrong", which
 * raises a dispute and alerts ops instead, deliberately before any money moves.
 */
export const dynamic = "force-dynamic";

const dateOnly = platformFormat({ day: "numeric", month: "short", year: "numeric" });
const dateTime = platformFormat({
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

export default async function ConfirmCompletionPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/bookings/${params.bookingId}/confirm-completion`);

  const booking = await prisma.booking.findUnique({
    where: { id: params.bookingId },
    include: {
      customer: { select: { userId: true } },
      advisor: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
      sessions: { orderBy: { scheduledAt: "asc" } },
    },
  });
  if (!booking) redirect("/");
  if (booking.customer.userId !== user.id) redirect("/");

  // Nothing to confirm — send them where the booking actually is.
  if (booking.status !== "awaiting_confirmation") {
    redirect(
      booking.status === "completed"
        ? `/bookings/${params.bookingId}/review`
        : `/bookings/${params.bookingId}/messages`,
    );
  }

  const advisorName = displayName(booking.advisor.user);
  const deadline = booking.advisorCompletedAt
    ? dateOnly.format(
        new Date(booking.advisorCompletedAt.getTime() + COMPLETION_AUTO_ACCEPT_DAYS * 86_400_000),
      )
    : null;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Confirm this is complete"
        subtitle={`${advisorName} has marked your work together as done. Confirming releases their payment.`}
      />

      <Card>
        <div className="flex items-baseline justify-between">
          <p className="text-h3 text-ink">{booking.scopeDescription}</p>
          <Money amountMinor={booking.priceCents} currency={booking.currency} className="text-h3 text-ink" />
        </div>

        <ul className="mt-4 flex flex-col gap-2 border-t border-dashed border-gray-300 pt-4">
          {booking.sessions.map((s, i) => (
            <li key={s.id} className="flex items-center justify-between text-body">
              <span className="text-gray-600">
                Session {i + 1} of {booking.sessionCount}
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="ws-mono text-sm text-gray-500">{dateTime.format(s.scheduledAt)}</span>
              </span>
              <span
                className={
                  s.status === "no_show" ? "text-sm font-semibold text-amber-700" : "text-sm font-semibold text-ink"
                }
              >
                {SESSION_OUTCOME_LABEL[s.status] ?? s.status}
              </span>
            </li>
          ))}
        </ul>

        <form action={confirmBookingCompletion} className="mt-6">
          <input type="hidden" name="bookingId" value={booking.id} />
          <Button type="submit" size="lg" className="w-full">
            <CheckCircle2 size={18} strokeWidth={2} /> Yes, this is complete
          </Button>
        </form>

        <p className="mt-3 flex items-start gap-2 text-sm text-gray-500">
          <ShieldCheck size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-gray-400" />
          <span>
            Your payment has been held since you booked. Confirming is what releases it to{" "}
            {advisorName}.
            {deadline && (
              <> If you don&apos;t get to this, we&apos;ll confirm it automatically on {deadline}.</>
            )}
          </span>
        </p>
      </Card>

      <details className="mt-4 rounded-lg border border-gray-200 bg-white">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600">
          <Flag size={15} strokeWidth={2} className="text-gray-400" />
          Something wasn&apos;t right? Report a problem instead
        </summary>
        <form action={raiseDispute} className="border-t border-gray-200 p-4">
          <input type="hidden" name="bookingId" value={booking.id} />
          <Textarea
            name="notes"
            rows={3}
            required
            placeholder="Tell us what happened — our team will step in before anything is paid out."
            className="w-full"
          />
          <Button type="submit" variant="secondary" className="mt-2">
            Report a problem
          </Button>
          <p className="mt-2 text-sm text-gray-500">
            This puts the booking on hold and alerts our team. Nothing is released to the advisor
            while we look into it.
          </p>
        </form>
      </details>

      <Link
        href={`/bookings/${booking.id}/messages`}
        className="mt-4 inline-flex text-sm font-semibold text-brand-blue hover:underline"
      >
        Open the message thread
      </Link>
    </div>
  );
}
