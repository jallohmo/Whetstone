import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageSquare } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADVISOR_STATUS_LABEL, LIVE_BOOKING_STATUSES } from "@/lib/booking-status";

// Screen 13 — Advisor booking inbox. Each row surfaces the customer's stated
// challenge + industry UP FRONT (from their latest need) so the advisor can prepare,
// plus the session time.
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-AU", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

export default async function AdvisorBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/bookings");

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) redirect("/advisor/apply");

  const bookings = await prisma.booking.findMany({
    where: {
      advisorId: profile.id,
      status: { in: ["pending_payment", ...LIVE_BOOKING_STATUSES] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { scheduledAt: "asc" }, take: 1 },
      customer: {
        include: {
          user: { select: { email: true } },
          needs: { orderBy: { createdAt: "desc" }, take: 1, include: { industry: true } },
        },
      },
    },
  });

  return (
    <div>
      <PageHeader title="Your bookings" subtitle="What each person actually wants help with — read before you join." />
      {bookings.length === 0 ? (
        <Card className="text-body text-gray-500">No upcoming bookings yet.</Card>
      ) : (
        <div className="flex flex-col gap-list-rhythm">
          {bookings.map((b) => {
            const need = b.customer.needs[0];
            const when = b.sessions[0]?.scheduledAt;
            const handle = b.customer.user.email.split("@")[0];
            return (
              <Card key={b.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={handle} size={44} />
                  <span className="ws-mono text-sm text-gray-500">
                    {when ? fmt.format(when) : "Time to be scheduled"}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    {b.status === "awaiting_confirmation" && (
                      <span className="rounded-pill bg-amber-100 px-2.5 py-1 text-2xs font-semibold text-amber-700">
                        {ADVISOR_STATUS_LABEL[b.status]}
                      </span>
                    )}
                    {need && <IndustryTag name={need.industry.name} />}
                  </span>
                </div>
                <p className="mt-3 text-h3 text-ink">
                  {need ? need.problemArea : b.scopeDescription}
                </p>
                {need?.description && (
                  <p className="mt-1 text-body text-gray-600 line-clamp-3">{need.description}</p>
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
