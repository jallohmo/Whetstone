import { PageHeader, Card, Button, ScaffoldNote } from "@/components/ui";

// Screen 12 — Availability/calendar management (A5). Large touch targets,
// confirm-before-submit (not instant-save-on-click) to reduce mis-click risk.
export default function AvailabilityPage() {
  const slots = ["Mon 10:00", "Mon 14:00", "Wed 11:00", "Thu 09:00", "Fri 15:00"];
  return (
    <div>
      <PageHeader title="Your availability" subtitle="Tap the times you're open to sessions. Nothing saves until you confirm." />
      <Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {slots.map((s) => (
            <button
              key={s}
              type="button"
              className="rounded-md border border-gray-200 bg-white px-4 py-4 text-body font-semibold text-ink hover:border-ink"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-dashed border-gray-300 pt-5">
          <span className="text-sm text-gray-500">Changes aren&apos;t saved yet.</span>
          <Button>Confirm availability</Button>
        </div>
      </Card>
      <div className="mt-6">
        <ScaffoldNote>
          AvailabilityCalendarEditor writes AvailabilitySlot rows for the signed-in advisor.
        </ScaffoldNote>
      </div>
    </div>
  );
}
