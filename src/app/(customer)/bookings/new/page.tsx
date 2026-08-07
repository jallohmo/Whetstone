import { PageHeader, Card, Button } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { createBooking } from "@/lib/actions/bookings";
import { prisma } from "@/lib/prisma";

// Screen 5 — Booking flow (A4, A5). Bounded-scope packages only (no open-ended
// hourly option — enforced by what the Package table exposes). Each package
// carries its own currency; the choice is copied onto the booking at creation.
export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { advisorId?: string; needId?: string };
}) {
  const advisorId = searchParams.advisorId ?? "";
  const packages = await prisma.package.findMany({
    where: { active: true },
    orderBy: { priceCents: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Book a session"
        subtitle="Pick a package. Every package has a fixed, defined scope."
      />
      <div className="flex flex-col gap-list-rhythm">
        {packages.map((p) => (
          <Card key={p.id}>
            <h3 className="text-h3 text-ink">{p.name}</h3>
            <div className="mt-3">
              <BoundedScopeSummary
                sessionCount={p.sessionCount}
                scopeDescription={p.scopeDescription}
                priceCents={p.priceCents}
                currency={p.currency}
              />
            </div>
            <form action={createBooking} className="mt-4">
              <input type="hidden" name="advisorId" value={advisorId} />
              <input type="hidden" name="packageId" value={p.id} />
              {searchParams.needId && (
                <input type="hidden" name="needId" value={searchParams.needId} />
              )}
              <Button type="submit">Choose this package</Button>
            </form>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-sm text-gray-500">
        A calendar picker (from the advisor&apos;s availability) slots in here before
        checkout. Scheduling is the next piece to wire.
      </p>
    </div>
  );
}
