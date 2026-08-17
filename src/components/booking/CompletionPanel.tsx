import Link from "next/link";
import { CheckCircle2, Clock, UserX } from "lucide-react";
import { Card, Button } from "@/components/ui";
import { markSessionOutcome, markBookingComplete } from "@/lib/actions/completion";
import {
  COMPLETABLE_BOOKING_STATUSES,
  SESSION_OUTCOME_LABEL,
  completionReadiness,
} from "@/lib/booking-status";

/**
 * The completion controls on a booking thread, rendered for whichever party has
 * something to do:
 *
 *  - advisor, booking live      -> record each past session's outcome, then mark
 *                                  the whole booking complete (only unlocked once
 *                                  every session has an outcome, so a 3-session
 *                                  package can't be closed after session 1);
 *  - advisor, awaiting client   -> read-only "waiting on them" state;
 *  - client, awaiting client    -> a link through to the confirm screen.
 *
 * Server component: plain form actions, no client JS.
 */

const dateTime = new Intl.DateTimeFormat("en-AU", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

export interface CompletionSession {
  id: string;
  scheduledAt: Date;
  status: string;
}

export function CompletionPanel({
  bookingId,
  bookingStatus,
  sessionCount,
  sessions,
  viewerIsAdvisor,
}: {
  bookingId: string;
  bookingStatus: string;
  sessionCount: number;
  sessions: CompletionSession[];
  viewerIsAdvisor: boolean;
}) {
  const live = COMPLETABLE_BOOKING_STATUSES.includes(bookingStatus as "confirmed" | "in_progress");
  const awaitingClient = bookingStatus === "awaiting_confirmation";
  if (!live && !awaitingClient) return null;

  // The client's only job here is to accept; everything else is the advisor's.
  if (!viewerIsAdvisor) {
    if (!awaitingClient) return null;
    return (
      <Card className="mb-page-gap border-brand-blue/30 bg-brand-blue/5">
        <p className="text-h3 text-ink">Your advisor has marked this complete</p>
        <p className="mt-1 text-body text-gray-600">
          Confirm it and their payment is released from the hold. If something wasn&apos;t right,
          you can tell us there instead.
        </p>
        <Link href={`/bookings/${bookingId}/confirm-completion`} className="mt-4 inline-flex">
          <Button>
            <CheckCircle2 size={16} strokeWidth={2} /> Review and confirm
          </Button>
        </Link>
      </Card>
    );
  }

  if (awaitingClient) {
    return (
      <Card className="mb-page-gap flex items-center gap-3 py-4">
        <Clock size={18} strokeWidth={2} className="shrink-0 text-gray-400" />
        <span className="text-body text-gray-600">
          Marked complete — waiting on your client to confirm. We&apos;ll nudge them, and confirm
          it automatically if they don&apos;t get to it. Your payout is released either way.
        </span>
      </Card>
    );
  }

  const now = new Date();
  const pending = sessions.filter((s) => s.status === "scheduled");
  const readiness = completionReadiness(bookingStatus, sessions, now);

  return (
    <Card className="mb-page-gap">
      <p className="text-h3 text-ink">
        Session {Math.min(sessions.length - pending.length + 1, sessionCount)} of {sessionCount}
      </p>
      <p className="mt-1 text-body text-gray-600">
        Record how each session went. Once they&apos;re all in, mark the booking complete and your
        client is asked to confirm.
      </p>

      <ul className="mt-4 flex flex-col gap-2 border-t border-dashed border-gray-300 pt-4">
        {sessions.map((s, i) => {
          const isPast = s.scheduledAt <= now;
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-body">
              <span className="text-gray-600">
                Session {i + 1}
                <span className="mx-1.5 text-gray-300">·</span>
                <span className="ws-mono text-sm text-gray-500">{dateTime.format(s.scheduledAt)}</span>
              </span>
              {s.status !== "scheduled" ? (
                <span
                  className={
                    s.status === "no_show"
                      ? "text-sm font-semibold text-amber-700"
                      : "text-sm font-semibold text-green-700"
                  }
                >
                  {SESSION_OUTCOME_LABEL[s.status] ?? s.status}
                </span>
              ) : isPast ? (
                <span className="flex gap-2">
                  <form action={markSessionOutcome}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <input type="hidden" name="outcome" value="completed" />
                    <Button type="submit" variant="secondary" className="px-3 py-1.5 text-sm">
                      <CheckCircle2 size={14} strokeWidth={2} /> Done
                    </Button>
                  </form>
                  <form action={markSessionOutcome}>
                    <input type="hidden" name="sessionId" value={s.id} />
                    <input type="hidden" name="outcome" value="no_show" />
                    <Button type="submit" variant="ghost" className="px-3 py-1.5 text-sm">
                      <UserX size={14} strokeWidth={2} /> No-show
                    </Button>
                  </form>
                </span>
              ) : (
                <span className="text-sm text-gray-400">Not yet</span>
              )}
            </li>
          );
        })}
      </ul>

      <form action={markBookingComplete} className="mt-5 border-t border-dashed border-gray-300 pt-4">
        <input type="hidden" name="bookingId" value={bookingId} />
        <Button type="submit" disabled={!readiness.ready}>
          <CheckCircle2 size={16} strokeWidth={2} /> Mark booking complete
        </Button>
        {!readiness.ready && <p className="mt-2 text-sm text-gray-500">{readiness.reason}</p>}
      </form>
    </Card>
  );
}
