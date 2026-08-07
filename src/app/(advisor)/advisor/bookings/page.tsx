import { PageHeader, Card } from "@/components/ui";
import { IndustryTag } from "@/components/shared/IndustryTag";

// Screen 13 — Advisor booking inbox. Each row surfaces the customer's stated
// problem and industry UP FRONT so the advisor can prepare.
export default function AdvisorBookingsPage() {
  const bookings = [
    { id: "bk_1", when: "Wed 11:00", industry: "Manufacturing", problem: "Supplier keeps missing lead times and it's hurting cash flow." },
    { id: "bk_2", when: "Fri 15:00", industry: "Hospitality", problem: "Deciding whether to take on a second site." },
  ];
  return (
    <div>
      <PageHeader title="Your bookings" subtitle="What each person actually wants help with — read before you join." />
      <div className="flex flex-col gap-list-rhythm">
        {bookings.map((b) => (
          <Card key={b.id}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-gray-500">{b.when}</span>
              <IndustryTag name={b.industry} />
            </div>
            <p className="mt-2 text-body-lg text-ink">{b.problem}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
