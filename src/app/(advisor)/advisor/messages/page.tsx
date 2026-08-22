import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, MessagesSquare } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadCounts } from "@/lib/thread-reads";
import { cn } from "@/lib/cn";
import { platformFormat } from "@/lib/time";

// Advisor message inbox. The bell in the header points here.
//
// Advisors previously had no inbox at all: /messages redirects them away
// (it is the client's), and the dashboard's Messages card sent them to
// /advisor/bookings — a list of bookings, not conversations. A bell needs
// somewhere to land that answers "who wrote to me", which is this.
//
// Ordered by the most recent message rather than by booking, because that is
// the order the question gets asked in.
export const dynamic = "force-dynamic";

const fmt = platformFormat({
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});

export default async function AdvisorMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/messages");
  if (user.role === "CUSTOMER") redirect("/messages");

  const [bookings, unread] = await Promise.all([
    prisma.booking.findMany({
      where: { advisor: { userId: user.id } },
      select: {
        id: true,
        scopeDescription: true,
        need: { select: { problemArea: true } },
        customer: {
          select: {
            businessName: true,
            user: { select: { firstName: true, lastName: true, fullName: true, email: true, avatarUrl: true } },
          },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    unreadCounts(user.id),
  ]);

  // Only threads that have actually been used — a booking nobody has written in
  // is a booking, and it already has a home in /advisor/bookings.
  const threads = bookings
    .filter((b) => b.messages.length > 0)
    .sort((a, b) => b.messages[0].createdAt.getTime() - a.messages[0].createdAt.getTime());

  const totalUnread = [...unread.values()].reduce((s, n) => s + n, 0);

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={
          totalUnread > 0
            ? `${totalUnread} unread — newest first.`
            : "Every conversation with your clients, newest first."
        }
      />

      {threads.length === 0 ? (
        <Card className="text-body text-gray-500">
          No messages yet. Clients can write to you from any confirmed booking.
        </Card>
      ) : (
        <div className="flex flex-col gap-list-rhythm">
          {threads.map((b) => {
            const last = b.messages[0];
            const clientName = displayName(b.customer.user);
            const n = unread.get(b.id) ?? 0;
            const fromThem = last.senderId !== user.id;
            return (
              <Link key={b.id} href={`/bookings/${b.id}/messages`}>
                <Card
                  className={cn(
                    "transition hover:-translate-y-px hover:shadow-float",
                    n > 0 && "border-brand-blue/40 bg-brand-blue/5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={clientName} src={b.customer.user.avatarUrl} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-h3 text-ink", n > 0 && "font-bold")}>
                        {b.customer.businessName || clientName}
                      </p>
                      <p className="ws-mono mt-0.5 text-sm text-gray-500">
                        {fmt.format(last.createdAt)}
                      </p>
                    </div>
                    {n > 0 && (
                      <span className="shrink-0 rounded-pill bg-brand-blue px-2.5 py-1 text-2xs font-semibold text-white">
                        {n} new
                      </span>
                    )}
                  </div>

                  {/* Whose words these are matters — without the prefix an
                      advisor re-reads their own last message as the client's. */}
                  <p className={cn("mt-3 line-clamp-2 text-body", n > 0 ? "text-ink" : "text-gray-600")}>
                    {!fromThem && <span className="text-gray-400">You: </span>}
                    {last.body}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-dashed border-gray-300 pt-4">
                    <span className="inline-flex items-center gap-1.5 truncate text-sm font-semibold text-brand-blue">
                      <MessagesSquare size={15} strokeWidth={2} />
                      {b.need?.problemArea ?? b.scopeDescription}
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-gray-400" />
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
