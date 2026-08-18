import { redirect } from "next/navigation";
import { CalendarClock, TriangleAlert, Trash2 } from "lucide-react";
import { PageHeader, Card } from "@/components/ui";
import { AvailabilityForm } from "@/components/advisor/AvailabilityForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { removeAvailabilitySlot } from "@/lib/actions/availability";
import { platformFormat } from "@/lib/time";

// Screen 12 — Availability/calendar management (A5). Explicit add/remove
// (confirm-before-save), large targets, forgiving of mis-clicks.
export const dynamic = "force-dynamic";

const fmt = platformFormat({
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const timeFmt = platformFormat({ hour: "numeric", minute: "2-digit" });

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/availability");

  // Profile and slots in ONE query rather than two serial ones: the slot lookup
  // only needed the profile id, so fetching it through the relation removes a
  // full database round trip from the critical path.
  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      verificationStatus: true,
      availabilitySlots: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
      },
    },
  });
  if (!profile) redirect("/advisor/apply");

  const slots = profile.availabilitySlots;

  return (
    <div>
      <PageHeader
        title="Your availability"
        subtitle="Add the times you're open to sessions. Clients can only book slots you've added."
      />

      {profile.verificationStatus !== "VERIFIED" && (
        <div className="mb-page-gap flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-100 p-4 text-sm text-amber-700">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" strokeWidth={2} />
          <p>
            You can set availability now, but clients won&apos;t see you until your
            profile is verified.
          </p>
        </div>
      )}

      <Card className="mb-page-gap">
        <h3 className="mb-4 text-h3 text-ink">Add a slot</h3>
        <AvailabilityForm />
      </Card>

      <h3 className="mb-3 text-h3 text-ink">Upcoming slots</h3>
      {slots.length === 0 ? (
        <Card className="text-body text-gray-500">No upcoming slots yet. Add one above.</Card>
      ) : (
        <div className="flex flex-col gap-list-rhythm">
          {slots.map((s) => (
            <Card key={s.id} className="flex items-center justify-between py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${
                    s.isBooked ? "bg-green-100 text-green-700" : "bg-brand-blue-100 text-brand-blue"
                  }`}
                >
                  <CalendarClock size={20} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-body font-semibold text-ink">
                    {fmt.format(s.startsAt)} – {timeFmt.format(s.endsAt)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {s.isBooked ? "Booked" : "Open"} ·{" "}
                    {Math.round((s.endsAt.getTime() - s.startsAt.getTime()) / 60000)} minutes
                  </p>
                </div>
              </div>
              {s.isBooked ? (
                <span className="rounded-pill bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                  Booked
                </span>
              ) : (
                <form action={removeAvailabilitySlot}>
                  <input type="hidden" name="slotId" value={s.id} />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-red-700"
                  >
                    <Trash2 size={16} strokeWidth={2} /> Remove
                  </button>
                </form>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
