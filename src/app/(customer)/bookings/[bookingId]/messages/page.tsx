import { redirect } from "next/navigation";
import { Flag, Video } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { MessageComposer } from "@/components/booking/MessageComposer";
import { startVideoCall } from "@/lib/actions/video";
import { raiseDispute } from "@/lib/actions/disputes";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorizedBooking } from "@/lib/actions/messages";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/cn";

// Screen 8 — In-session messaging (A7). Simple thread, booking-parties only.
// Plus a "Join video" affordance for the scheduled session (Daily.co).
export const dynamic = "force-dynamic";

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: { bookingId: string };
  searchParams: { reported?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/bookings/${params.bookingId}/messages`);

  const booking = await getAuthorizedBooking(
    params.bookingId,
    user.id,
    user.role === "OPS_ADMIN",
  );
  if (!booking) redirect("/");

  const [messages, nextSession, parties] = await Promise.all([
    prisma.message.findMany({
      where: { bookingId: params.bookingId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.session.findFirst({
      where: { bookingId: params.bookingId, status: "scheduled" },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.booking.findUnique({
      where: { id: params.bookingId },
      select: {
        advisor: { select: { userId: true, user: { select: { email: true } } } },
        customer: { select: { userId: true, user: { select: { email: true } } } },
      },
    }),
  ]);

  const isParty = booking.customer.userId === user.id || booking.advisor.userId === user.id;
  const viewerIsAdvisor = booking.advisor.userId === user.id;
  const counterpartEmail = viewerIsAdvisor
    ? parties?.customer.user.email
    : parties?.advisor.user.email;
  const counterpartHandle = counterpartEmail?.split("@")[0] ?? "advisor";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Messages"
        subtitle="Keep it here so everything stays on the record for your session."
      />

      {searchParams.reported && (
        <div className="mb-page-gap rounded-lg border border-amber-500/40 bg-amber-100 p-4 text-sm text-amber-700">
          Thanks — our team has your report and will be in touch. The booking is on hold.
        </div>
      )}

      {nextSession && isParty && (
        <Card className="mb-page-gap flex items-center justify-between py-4">
          <span className="flex items-center gap-3">
            <Avatar name={counterpartHandle} gradient="pink-amber" size={40} />
            <span className="text-body text-gray-600">
              <span className="font-semibold text-ink">{counterpartHandle}</span>
              <span className="mx-1.5 text-gray-300">·</span>
              Session on{" "}
              <span className="font-semibold text-ink">
                {new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(nextSession.scheduledAt)}
              </span>
            </span>
          </span>
          <form action={startVideoCall}>
            <input type="hidden" name="sessionId" value={nextSession.id} />
            <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px">
              <Video size={16} strokeWidth={2} /> Join video
            </button>
          </form>
        </Card>
      )}

      <Card className="p-0">
        <div className="flex min-h-[300px] flex-col gap-3 p-card">
          {messages.length === 0 ? (
            <p className="m-auto text-sm text-gray-400">No messages yet. Say hello.</p>
          ) : (
            messages.map((m) => {
              const mine = m.senderId === user.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex max-w-[80%] items-end gap-2",
                    mine ? "self-end flex-row-reverse" : "self-start",
                  )}
                >
                  {!mine && (
                    <Avatar name={counterpartHandle} gradient="pink-amber" size={28} />
                  )}
                  <div
                    className={cn(
                      "rounded-lg px-3.5 py-2.5 text-body",
                      mine
                        ? "rounded-br-xs bg-ink text-white"
                        : "rounded-bl-xs bg-gray-100 text-ink",
                    )}
                  >
                    {m.body}
                  </div>
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

      {isParty && (
        <details className="mt-4 rounded-lg border border-gray-200 bg-white">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-600">
            <Flag size={15} strokeWidth={2} className="text-gray-400" />
            Something went wrong? Report a problem
          </summary>
          <form action={raiseDispute} className="border-t border-gray-200 p-4">
            <input type="hidden" name="bookingId" value={params.bookingId} />
            <textarea
              name="notes"
              rows={3}
              required
              placeholder="Tell us what happened — our team will step in."
              className="w-full rounded-sm border border-gray-200 px-3 py-2 text-body outline-none transition duration-DEFAULT ease-soft focus:border-brand-blue focus:shadow-focus"
            />
            <button type="submit" className="mt-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px">
              Send report
            </button>
          </form>
        </details>
      )}
    </div>
  );
}
