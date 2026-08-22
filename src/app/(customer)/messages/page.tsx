import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCounts } from "@/lib/thread-reads";
import { cn } from "@/lib/cn";
import { platformFormat } from "@/lib/time";

// Client messages index — one row per booking conversation, latest activity
// first. The "Messages" nav destination and dashboard "Open" target.
export const dynamic = "force-dynamic";

const shortDate = platformFormat({ day: "numeric", month: "short", year: "numeric" });

export default async function ClientMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");
  if (user.role === "ADVISOR") redirect("/advisor");
  if (user.role === "OPS_ADMIN") redirect("/ops");

  // Filtered through the customer relation rather than looking the profile id up
  // first: one database round trip instead of two serial ones. A user with no
  // customer profile matches nothing, which is what the old profile guard
  // produced anyway.
  const [bookings, unread] = await Promise.all([
    prisma.booking.findMany({
    where: { customer: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      advisor: {
        select: {
          avatarUrl: true,
          user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
    }),
    unreadCounts(user.id),
  ]);

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
            const n = unread.get(b.id) ?? 0;
            const fromThem = last.senderId !== user.id;
            return (
              <Link key={b.id} href={`/bookings/${b.id}/messages`}>
                <Card
                  className={cn(
                    "flex items-center gap-3 transition hover:-translate-y-px hover:shadow-float",
                    n > 0 && "border-brand-blue/40 bg-brand-blue/5",
                  )}
                >
                  <Avatar name={advisorName} src={b.advisor.avatarUrl ?? b.advisor.user.avatarUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-body font-semibold text-ink", n > 0 && "font-bold")}>
                        {advisorName}
                      </p>
                      <span className="ws-mono shrink-0 text-2xs text-gray-400">{shortDate.format(last.createdAt)}</span>
                    </div>
                    {/* Without the prefix a client re-reads their own last
                        message as the advisor's. */}
                    <p className={cn("truncate text-sm", n > 0 ? "text-ink" : "text-gray-500")}>
                      {!fromThem && <span className="text-gray-400">You: </span>}
                      {last.body}
                    </p>
                  </div>
                  {n > 0 && (
                    <span className="shrink-0 rounded-pill bg-brand-blue px-2.5 py-1 text-2xs font-semibold text-white">
                      {n} new
                    </span>
                  )}
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
