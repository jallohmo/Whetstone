import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Client messages index — one row per booking conversation, latest activity
// first. The "Messages" nav destination and dashboard "Open" target.
export const dynamic = "force-dynamic";

const shortDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });

export default async function ClientMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");
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
          id: true,
          advisor: {
            select: {
              avatarUrl: true,
              user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
            },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } },
        },
      })
    : [];

  // Show conversations with at least one message, most-recent activity first.
  const threads = bookings
    .filter((b) => b.messages.length > 0)
    .sort((a, b) => b.messages[0].createdAt.getTime() - a.messages[0].createdAt.getTime());

  return (
    <div>
      <PageHeader title="Messages" subtitle="Your session conversations, kept on the record." />
      {threads.length === 0 ? (
        <Card className="text-body text-gray-500">
          No conversations yet. Messages appear here once a session is booked.
        </Card>
      ) : (
        <div className="flex flex-col gap-list-rhythm">
          {threads.map((b) => {
            const advisorName = displayName(b.advisor.user);
            const last = b.messages[0];
            return (
              <Link key={b.id} href={`/bookings/${b.id}/messages`}>
                <Card className="flex items-center gap-3 transition hover:-translate-y-px hover:shadow-float">
                  <Avatar name={advisorName} src={b.advisor.avatarUrl ?? b.advisor.user.avatarUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-body font-semibold text-ink">{advisorName}</p>
                      <span className="ws-mono shrink-0 text-2xs text-gray-400">{shortDate.format(last.createdAt)}</span>
                    </div>
                    <p className="truncate text-sm text-gray-500">{last.body}</p>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-gray-400" />
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
