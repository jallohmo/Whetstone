import Link from "next/link";
import { PageHeader, Card, ScaffoldNote } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";

// Screen 5 — Booking flow (A4, A5). Package selection (bounded-scope only,
// no open-ended hourly option) + calendar picker. Currency comes from the
// package and is carried through the whole booking.
export default function NewBookingPage({
  searchParams,
}: {
  searchParams: { advisorId?: string; needId?: string };
}) {
  // Sample packages — real ones come from the Package table, each with its own currency.
  const packages = [
    { id: "pkg_1", name: "Single session", sessionCount: 1, scope: "One focused 60-minute session on a single defined problem.", priceCents: 12000, currency: "USD" },
    { id: "pkg_3", name: "Three-session engagement", sessionCount: 3, scope: "Three sessions over four weeks — diagnose, plan, review.", priceCents: 30000, currency: "USD" },
  ];

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Book a session" subtitle="Pick a package and a time. Every package has a fixed, defined scope." />
      <div className="flex flex-col gap-list-rhythm">
        {packages.map((p) => (
          <Card key={p.id}>
            <h3 className="text-h3 text-ink">{p.name}</h3>
            <div className="mt-3">
              <BoundedScopeSummary
                sessionCount={p.sessionCount}
                scopeDescription={p.scope}
                priceCents={p.priceCents}
                currency={p.currency}
              />
            </div>
            <div className="mt-4">
              <Link
                href={`/bookings/pending/checkout?advisorId=${searchParams.advisorId ?? ""}&packageId=${p.id}`}
                className="inline-flex rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-ink-glow"
              >
                Choose this package
              </Link>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <ScaffoldNote>
          BookingCalendar reads AvailabilitySlot for advisor{" "}
          <code className="font-mono">{searchParams.advisorId ?? "—"}</code>. Package selector must
          expose bounded-scope packages only (enforced in options, not just copy).
        </ScaffoldNote>
      </div>
    </div>
  );
}
