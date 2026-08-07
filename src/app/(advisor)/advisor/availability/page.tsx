import { redirect } from "next/navigation";
import { CalendarClock, Trash2 } from "lucide-react";
import { PageHeader, Card, Button } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAvailabilitySlot, removeAvailabilitySlot } from "@/lib/actions/availability";

// Screen 12 — Availability/calendar management (A5). Explicit add/remove
// (confirm-before-save), large targets, forgiving of mis-clicks.
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/availability");

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, verificationStatus: true },
  });
  if (!profile) redirect("/advisor/apply");

  const slots = await prisma.availabilitySlot.findMany({
    where: { advisorId: profile.id, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Your availability"
        subtitle="Add the times you're open to sessions. Customers can only book slots you've added."
      />

      {profile.verificationStatus !== "VERIFIED" && (
        <div className="mb-page-gap rounded-lg border border-amber-500/40 bg-amber-100 p-4 text-sm text-amber-700">
          You can set availability now, but customers won&apos;t see you until your
          profile is verified.
        </div>
      )}

      <Card className="mb-page-gap">
        <h3 className="mb-3 text-h3 text-ink">Add a slot</h3>
        <form action={addAvailabilitySlot} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Date &amp; start time</label>
            <input
              type="datetime-local"
              name="startsAt"
              required
              className="rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-body text-ink outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-ink">Length</label>
            <select
              name="durationMin"
              defaultValue="60"
              className="rounded-sm border border-gray-200 bg-white px-3 py-2.5 text-body text-ink outline-none focus:border-ink"
            >
              <option value="30">30 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
          <Button type="submit">Add slot</Button>
        </form>
      </Card>

      <h3 className="mb-3 text-h3 text-ink">Upcoming slots</h3>
      {slots.length === 0 ? (
        <Card className="text-body text-gray-500">No upcoming slots yet. Add one above.</Card>
      ) : (
        <div className="flex flex-col gap-list-rhythm">
          {slots.map((s) => (
            <Card key={s.id} className="flex items-center justify-between py-4">
              <span className="flex items-center gap-2 text-body text-ink">
                <CalendarClock size={18} className="text-gray-400" />
                {fmt.format(s.startsAt)} – {new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" }).format(s.endsAt)}
              </span>
              {s.isBooked ? (
                <span className="rounded-pill bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Booked</span>
              ) : (
                <form action={removeAvailabilitySlot}>
                  <input type="hidden" name="slotId" value={s.id} />
                  <button type="submit" className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-red-700">
                    <Trash2 size={16} /> Remove
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
