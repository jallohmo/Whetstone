import { notFound } from "next/navigation";
import { PageHeader, Card, Button } from "@/components/ui";
import { BoundedScopeSummary } from "@/components/shared/BoundedScopeSummary";
import { createBooking } from "@/lib/actions/bookings";
import { prisma } from "@/lib/prisma";

// Screen 5 — Booking flow (A4, A5). One form: pick a bounded-scope package AND a
// time from the advisor's real availability. No open-ended hourly option.
export const dynamic = "force-dynamic";

const slotFmt = new Intl.DateTimeFormat("en-AU", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: { advisorId?: string; needId?: string };
}) {
  const advisorId = searchParams.advisorId ?? "";
  const advisor = advisorId
    ? await prisma.advisorProfile.findUnique({ where: { id: advisorId } })
    : null;
  if (!advisor || advisor.verificationStatus !== "VERIFIED") notFound();

  const [packages, slots] = await Promise.all([
    prisma.package.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    prisma.availabilitySlot.findMany({
      where: { advisorId, isBooked: false, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 30,
    }),
  ]);

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Book a session" subtitle="Pick a package and a time. Every package has a fixed, defined scope." />

      <form action={createBooking}>
        <input type="hidden" name="advisorId" value={advisorId} />
        {searchParams.needId && <input type="hidden" name="needId" value={searchParams.needId} />}

        {/* Packages */}
        <fieldset className="mb-6">
          <legend className="mb-3 text-h3 text-ink">Choose a package</legend>
          <div className="flex flex-col gap-list-rhythm">
            {packages.map((p, i) => (
              <label key={p.id} className="block cursor-pointer">
                <Card className="flex gap-3">
                  <input type="radio" name="packageId" value={p.id} required defaultChecked={i === 0} className="mt-1 h-4 w-4 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-h3 text-ink">{p.name}</h4>
                    <div className="mt-2">
                      <BoundedScopeSummary
                        sessionCount={p.sessionCount}
                        scopeDescription={p.scopeDescription}
                        priceCents={p.priceCents}
                        currency={p.currency}
                      />
                    </div>
                  </div>
                </Card>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Times */}
        <fieldset className="mb-6">
          <legend className="mb-3 text-h3 text-ink">Choose a time</legend>
          {slots.length === 0 ? (
            <Card className="text-body text-gray-500">
              This advisor has no open times right now. Message them to arrange one, or
              check back soon.
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {slots.map((s, i) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2.5 text-body text-ink has-[:checked]:border-ink">
                  <input type="radio" name="slotId" value={s.id} required defaultChecked={i === 0} className="h-4 w-4" />
                  {slotFmt.format(s.startsAt)}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <Button type="submit" disabled={slots.length === 0}>
          Continue to checkout
        </Button>
      </form>
    </div>
  );
}
