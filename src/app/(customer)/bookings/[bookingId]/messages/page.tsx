import { redirect } from "next/navigation";
import { Video } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { MessageComposer } from "@/components/booking/MessageComposer";
import { startVideoCall } from "@/lib/actions/video";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizedBooking } from "@/lib/actions/messages";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";

// Screen 8 — In-session messaging (A7). Simple thread, booking-parties only.
// Plus a "Join video" affordance for the scheduled session (Daily.co).
export const dynamic = "force-dynamic";

export default async function MessagesPage({
  params,
}: {
  params: { bookingId: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/bookings/${params.bookingId}/messages`);

  const booking = await getAuthorizedBooking(
    params.bookingId,
    user.id,
    user.role === "OPS_ADMIN",
  );
  if (!booking) redirect("/");

  const [messages, nextSession] = await Promise.all([
    prisma.message.findMany({
      where: { bookingId: params.bookingId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.findFirst({
      where: { bookingId: params.bookingId, status: "scheduled" },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const isParty = booking.customer.userId === user.id || booking.advisor.userId === user.id;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Messages" subtitle="Keep it here so everything stays on the record for your session." />

      {nextSession && isParty && (
        <Card className="mb-page-gap flex items-center justify-between py-4">
          <span className="text-body text-gray-600">
            Session on{" "}
            <span className="font-semibold text-ink">
              {new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(nextSession.scheduledAt)}
            </span>
          </span>
          <form action={startVideoCall}>
            <input type="hidden" name="sessionId" value={nextSession.id} />
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink-glow">
              <Video size={16} /> Join video
            </button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex min-h-[280px] flex-col gap-3 p-card">
          {messages.length === 0 ? (
            <p className="m-auto text-sm text-gray-400">No messages yet. Say hello.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-body",
                    mine ? "self-end rounded-br-xs bg-ink text-white" : "self-start rounded-bl-xs bg-gray-100 text-ink",
                  )}
                >
                  {m.body}
                </div>
              );
            })
          )}
        </div>
        {isParty ? (
          <MessageComposer bookingId={params.bookingId} />
        ) : (
          <p className="border-t border-gray-200 p-3 text-sm text-gray-400">
            You&apos;re viewing this thread as ops — read only.
          </p>
        )}
      </Card>
    </div>
  );
}
