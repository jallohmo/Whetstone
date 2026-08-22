import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageSquare, Sparkles } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADVISOR_STATUS_LABEL, LIVE_BOOKING_STATUSES } from "@/lib/booking-status";
import { platformFormat } from "@/lib/time";

// Screen 13 — Advisor booking inbox. Each row surfaces the client's stated
// challenge + industry UP FRONT so the advisor can prepare, plus the session
// time. Newest first, with the most recent booking marked so it doesn't have to
// be found by reading dates down the list.
//
// The challenge comes from the BOOKING's need (Booking.needId), not from the
// client's most recent need. Reading "latest need" was right only until a client
// posted a second challenge — from then on every advisor saw the same newest
// brief regardless of what they had actually been booked for.
export const dynamic = "force-dynamic";

const fmt = platformFormat({
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

export default async function AdvisorBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/bookings");

  // Both queries are keyed off the signed-in user, so they run in parallel
  // rather than waiting on the profile id — one round trip instead of two.
  const [profile, bookings] = await Promise.all([
    prisma.advisorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    }),
    prisma.booking.findMany({
      where: {
        advisor: { userId: user.id },
        status: { in: ["pending_payment", ...LIVE_BOOKING_STATUSES] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        sessions: { orderBy: { scheduledAt: "asc" }, take: 1 },
        need: { include: { industry: true } },
        customer: { include: { user: { select: { email: true } } } },
      },
    }),
  ]);
  if (!profile) redirect("/advisor/apply");

  return (
    <div>
      <PageHeader title="Your bookings" subtitle="What each person actually wants help with — read before you join." />
      {bookings.length === 0 ? (
        <Card className="text-body text-gray-500">No upcoming bookings yet.</Card>
      ) : (
        <div className="flex flex-col gap-list-rhythm">
          {bookings.map((b, i) => {
            const need = b.need;
            const when = b.sessions[0]?.scheduledAt;
            const handle = b.customer.user.email.split("@")[0];
            // Ordered createdAt desc, so index 0 is the newest booking. Only
            // worth marking when there is something to tell it apart from —
            // badging a list of one says nothing.
            const isLatest = i === 0 && bookings.length > 1;
            return (
              <Card
                key={b.id}
                className={cn(isLatest && "border-brand-blue/40 bg-brand-blue/5 shadow-float")}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={handle} size={44} />
                  <span className="ws-mono text-sm text-gray-500">
                    {when ? fmt.format(when) : "Time to be scheduled"}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {isLatest && (
                      <span className="inline-flex items-center gap-1 rounded-pill bg-brand-blue px-2.5 py-1 text-2xs font-semibold text-white">
                        <Sparkles size={11} strokeWidth={2.5} /> Latest
                      </span>
                    )}
                    {b.status === "awaiting_confirmation" && (
                      <span className="rounded-pill bg-amber-100 px-2.5 py-1 text-2xs font-semibold text-amber-700">
                        {ADVISOR_STATUS_LABEL[b.status]}
                      </span>
                    )}
                    {need && <IndustryTag name={need.industry.name} />}
                  </span>
                </div>
                {/* No need attached means the client booked directly without
                    posting a challenge. Say so rather than rendering the
                    package's stock scope line where the client's own words
                    belong — that reads as a brief and isn't one. */}
                {need ? (
                  <>
                    <p className="mt-3 text-h3 text-ink">{need.problemArea}</p>
                    {need.description && (
                      <p className="mt-1 text-body text-gray-600 line-clamp-3">{need.description}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-3 text-h3 text-gray-500">No challenge posted</p>
                    <p className="mt-1 text-body text-gray-600 line-clamp-3">
                      Booked directly — {b.sessionCount === 1 ? "a single session" : `${b.sessionCount} sessions`}.
                      Ask what they&apos;re after before you join.
                    </p>
                  </>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-300 pt-4">
                  <Link
                    href={`/bookings/${b.id}/messages`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
                  >
                    <MessageSquare size={15} strokeWidth={2} /> Messages &amp; video
                  </Link>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
