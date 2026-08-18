import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { BookingStepper } from "@/components/ui/BookingStepper";
import { RadioCard } from "@/components/ui/selection";
import { Money } from "@/components/shared/Money";
import { createBooking } from "@/lib/actions/bookings";
import { prisma } from "@/lib/prisma";
import { platformFormat } from "@/lib/time";

// Screen 5 — Booking flow (A4, A5). One form: pick a bounded-scope package AND a
// time from the advisor's real availability. No open-ended hourly option.
export const dynamic = "force-dynamic";

const slotFmt = platformFormat({
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
  if (!advisor || advisor.verificationStatus !== "VERIFIED" || advisor.deactivatedAt) notFound();

  const [packages, slots] = await Promise.all([
    prisma.package.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
    prisma.availabilitySlot.findMany({
      where: { advisorId, isBooked: false, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 30,
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <BookingStepper current="book" />
      </div>
      <PageHeader
        title="Book a session"
        subtitle="Pick a package and a time. Every package has a fixed, defined scope."
      />

      <form action={createBooking}>
        <input type="hidden" name="advisorId" value={advisorId} />
        {searchParams.needId && <input type="hidden" name="needId" value={searchParams.needId} />}

        {/* Packages */}
        <fieldset className="mb-8">
          <legend className="mb-3 text-h3 text-ink">Choose a package</legend>
          <div className="flex flex-col gap-list-rhythm">
            {packages.map((p, i) => (
              <RadioCard key={p.id} name="packageId" value={p.id} defaultChecked={i === 0}>
                <div className="pr-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <h4 className="text-h3 text-ink">{p.name}</h4>
                    <Money
                      amountMinor={p.priceCents}
                      currency={p.currency}
                      className="text-body font-semibold text-ink"
                    />
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-body font-medium text-ink">
                    <Check size={16} className="text-green-500" strokeWidth={2.5} />
                    {p.sessionCount} {p.sessionCount === 1 ? "session" : "sessions"}, fixed scope
                  </p>
                  <p className="mt-1 text-body text-gray-600">{p.scopeDescription}</p>
                  <p className="mt-3 border-t border-dashed border-gray-300 pt-3 text-sm text-gray-500">
                    Bounded engagement — no open-ended hours.
                  </p>
                </div>
              </RadioCard>
            ))}
          </div>
        </fieldset>

        {/* Times */}
        <fieldset className="mb-8">
          <legend className="mb-3 text-h3 text-ink">Choose a time</legend>
          {slots.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-card text-body text-gray-500 shadow-card">
              This advisor has no open times right now. Message them to arrange one, or
              check back soon.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {slots.map((s, i) => (
                <RadioCard
                  key={s.id}
                  name="slotId"
                  value={s.id}
                  defaultChecked={i === 0}
                  className="p-3.5"
                >
                  <span className="pr-6 text-body font-medium text-ink">
                    {slotFmt.format(s.startsAt)}
                  </span>
                </RadioCard>
              ))}
            </div>
          )}
        </fieldset>

        <Button type="submit" size="lg" disabled={slots.length === 0}>
          Continue to checkout
          <ArrowRight size={18} strokeWidth={2} />
        </Button>
      </form>
    </div>
  );
}
