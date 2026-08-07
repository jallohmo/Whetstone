import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { IndustryTag } from "@/components/shared/IndustryTag";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Screen 13 — Advisor booking inbox. Each row surfaces the customer's stated
// problem + industry UP FRONT (from their latest need) so the advisor can prepare,
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
    where: { advisorId: profile.id, status: { in: ["confirmed", "in_progress", "pending_payment"] } },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: { orderBy: { scheduledAt: "asc" }, take: 1 },
      customer: {
        include: {
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
            return (
              <Card key={b.id}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-gray-500">
                    {when ? fmt.format(when) : "Time to be scheduled"}
                  </span>
                  {need && <IndustryTag name={need.industry.name} />}
                </div>
                <p className="mt-2 text-body-lg text-ink">
                  {need ? need.problemArea : b.scopeDescription}
                </p>
                {need?.description && (
                  <p className="mt-1 text-body text-gray-600 line-clamp-3">{need.description}</p>
                )}
                <div className="mt-3 border-t border-dashed border-gray-300 pt-3">
                  <Link
                    href={`/bookings/${b.id}/messages`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline"
                  >
                    <MessageSquare size={15} /> Messages &amp; video
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
