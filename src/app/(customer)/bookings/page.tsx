import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessageSquare } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Client bookings list — the "Bookings" nav destination and the "View all"
// target from the home dashboard. Read-only; each row opens the booking thread.
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-AU", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export default async function ClientBookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/bookings");
  if (user.role === "ADVISOR") redirect("/advisor");
  if (user.role === "OPS_ADMIN") redirect("/ops");

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  const bookings = profile
    ? await prisma.booking.findMany({
        where: { customerId: profile.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, status: true, scopeDescription: true,
          sessions: { orderBy: { scheduledAt: "asc" }, take: 1, select: { scheduledAt: true } },
          advisor: {
            select: {
              avatarUrl: true,
              user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
            },
          },
        },
      })
    : [];

  return (
    <div>
      <PageHeader title="Your bookings" subtitle="Every session you've booked, newest first." />
      {bookings.length === 0 ? (
        <Card className="text-body text-gray-500">
          You have no bookings yet.{" "}
          <Link href="/needs/new" className="font-semibold text-brand-blue hover:underline">
            Describe a problem
          </Link>{" "}
          to get matched.
        </Card>
      ) : (
        <div className="flex flex-col gap-list-rhythm">
          {bookings.map((b) => {
            const advisorName = displayName(b.advisor.user);
            const when = b.sessions[0]?.scheduledAt;
            return (
              <Link key={b.id} href={`/bookings/${b.id}/messages`}>
                <Card className="transition hover:-translate-y-px hover:shadow-float">
                  <div className="flex items-center gap-3">
                    <Avatar name={advisorName} src={b.advisor.avatarUrl ?? b.advisor.user.avatarUrl} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-h3 text-ink">{advisorName}</p>
                      <p className="ws-mono mt-0.5 text-sm text-gray-500">
                        {when ? dateTime.format(when) : "Time to be scheduled"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-pill bg-gray-100 px-2.5 py-1 text-2xs font-semibold text-gray-600">
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </div>
                  <p className="mt-3 text-body text-gray-600 line-clamp-2">{b.scopeDescription}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-300 pt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue">
                      <MessageSquare size={15} strokeWidth={2} /> Messages &amp; video
                    </span>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
