import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  MessageSquare,
  Plus,
  Star,
  Video,
} from "lucide-react";
import { Card, Eyebrow } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { Money } from "@/components/shared/Money";
import { DashCard } from "@/components/dashboard/DashCard";
import { StatCard, DeltaPill } from "@/components/dashboard/StatCard";
import { EarningsBarChart } from "@/components/dashboard/EarningsBarChart";
import { MessageBell } from "@/components/shared/MessageBell";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unreadTotal } from "@/lib/thread-reads";
import { buildEarningsSummary, greeting, firstNameOf } from "@/lib/dashboard";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { IN_DELIVERY_BOOKING_STATUSES } from "@/lib/booking-status";
import { platformFormat } from "@/lib/time";

// Screen 9d — Advisor home. The signed-in landing for advisors: a read-mostly
// summary that deep-links into the detail screens (13 bookings, 14 earnings, 12
// availability). No new domain models — assembled from existing queries.
export const dynamic = "force-dynamic";

const dateTime = platformFormat({
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});
const fullDate = platformFormat({ weekday: "long", day: "numeric", month: "long" });
const reviewDate = platformFormat({ day: "numeric", month: "short", year: "numeric" });

export default async function AdvisorHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor");

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true, verificationStatus: true },
  });
  if (!profile) redirect("/advisor/apply");

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const weekStart = new Date(now);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7)); // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [payments, upcoming, reviews, openSlots, sessionsThisMonth, sessionsThisWeek, recentMessages, unreadMessages] =
    await Promise.all([
      prisma.payment.findMany({
        where: { booking: { advisorId: profile.id } },
        select: { amountCents: true, currency: true, status: true, booking: { select: { createdAt: true } } },
      }),
      prisma.session.findMany({
        where: {
          scheduledAt: { gte: now },
          booking: { advisorId: profile.id, status: { in: [...IN_DELIVERY_BOOKING_STATUSES] } },
        },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        select: {
          id: true, scheduledAt: true,
          booking: {
            select: {
              id: true,
              customer: {
                select: {
                  businessName: true,
                  user: { select: { avatarUrl: true } },
                  needs: { orderBy: { createdAt: "desc" }, take: 1, select: { problemArea: true } },
                },
              },
            },
          },
        },
      }),
      prisma.review.findMany({
        where: { booking: { advisorId: profile.id } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          rating: true, writtenReview: true, createdAt: true,
          booking: { select: { customer: { select: { businessName: true } } } },
        },
      }),
      prisma.availabilitySlot.count({
        where: { advisorId: profile.id, isBooked: false, startsAt: { gte: weekStart, lt: weekEnd } },
      }),
      prisma.session.count({
        where: { booking: { advisorId: profile.id }, scheduledAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.session.count({
        where: { booking: { advisorId: profile.id }, scheduledAt: { gte: weekStart, lt: weekEnd } },
      }),
      prisma.message.findMany({
        where: { booking: { advisorId: profile.id } },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          body: true, createdAt: true, bookingId: true,
          booking: { select: { customer: { select: { businessName: true, user: { select: { avatarUrl: true } } } } } },
        },
      }),
      // Resolved at render, so it is accurate as of this navigation and goes
      // stale until the next one — see MessageBell.
      unreadTotal(user.id),
    ]);

  const name = firstNameOf(displayName(user));
  const verified = profile.verificationStatus === "VERIFIED";
  const earnings = buildEarningsSummary(
    payments.map((p) => ({ amountCents: p.amountCents, currency: p.currency, status: p.status, at: p.booking.createdAt })),
  );

  const ratingsAll = await prisma.review.aggregate({
    where: { booking: { advisorId: profile.id } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const avgRating = ratingsAll._avg.rating;
  const reviewCount = ratingsAll._count._all;

  // Dedupe recent messages down to one row per conversation.
  const threads: typeof recentMessages = [];
  const seen = new Set<string>();
  for (const m of recentMessages) {
    if (seen.has(m.bookingId)) continue;
    seen.add(m.bookingId);
    threads.push(m);
    if (threads.length >= 3) break;
  }

  return (
    <div>
      {/* Greeting */}
      <div className="mb-page-gap flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-h1 text-ink">
              {greeting(now)}, {name}
            </h1>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                <BadgeCheck size={14} strokeWidth={2} /> Verified
              </span>
            )}
          </div>
          <p className="mt-2 text-body-lg text-gray-500">
            {fullDate.format(now)} ·{" "}
            <span className="font-semibold text-ink">
              {sessionsThisWeek} {sessionsThisWeek === 1 ? "session" : "sessions"}
            </span>{" "}
            this week
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MessageBell count={unreadMessages} href="/advisor/messages" />
          <Link
            href="/advisor/availability"
            className="inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px"
          >
            <Plus size={16} strokeWidth={2} /> Add availability
          </Link>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mb-page-gap grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This month"
          value={<Money amountMinor={earnings.thisMonthMinor} currency={earnings.currency} className="text-[26px]" />}
          footnote={
            earnings.momPct != null && earnings.momPct !== 0 ? (
              <DeltaPill>
                <ArrowUpRight size={12} strokeWidth={2.5} /> {earnings.momPct > 0 ? "+" : ""}
                {earnings.momPct}%
              </DeltaPill>
            ) : (
              "vs last month"
            )
          }
        />
        <StatCard label="Sessions" value={sessionsThisMonth} footnote="this month" />
        <StatCard
          label="Avg rating"
          value={
            <span className="inline-flex items-center gap-1.5">
              {avgRating != null ? avgRating.toFixed(1) : "—"}
              <Star size={18} className="text-amber-500" fill="currentColor" strokeWidth={0} />
            </span>
          }
          footnote={`${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`}
        />
        <StatCard label="Open slots" value={openSlots} footnote="this week" />
      </div>

      {/* Body grid */}
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Earnings */}
          <Card>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-h3 text-ink">Earnings</h2>
                <div className="mt-1 flex items-center gap-2.5">
                  <Money
                    amountMinor={earnings.totalMinor}
                    currency={earnings.currency}
                    className="text-[28px] font-bold tracking-[-0.02em]"
                  />
                  {earnings.momPct != null && earnings.momPct !== 0 && (
                    <DeltaPill>
                      <ArrowUpRight size={12} strokeWidth={2.5} /> {earnings.momPct > 0 ? "+" : ""}
                      {earnings.momPct}% vs last month
                    </DeltaPill>
                  )}
                </div>
              </div>
              <Link href="/advisor/earnings" className="text-sm font-semibold text-brand-blue hover:underline">
                View all
              </Link>
            </div>
            <EarningsBarChart data={earnings.series} currency={earnings.currency} />
          </Card>

          {/* Upcoming sessions */}
          <DashCard title="Upcoming sessions" action={{ label: "View all", href: "/advisor/bookings" }}>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing booked yet — add availability to get booked.</p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {upcoming.map((s, i) => {
                  const c = s.booking.customer;
                  const challenge = c.needs[0]?.problemArea ?? "Advisory session";
                  return (
                    <div key={s.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                      <Avatar name={c.businessName} src={c.user.avatarUrl} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body font-semibold text-ink">{challenge}</p>
                        <p className="ws-mono mt-0.5 text-sm text-gray-500">{dateTime.format(s.scheduledAt)}</p>
                      </div>
                      <Link
                        href={`/bookings/${s.booking.id}/messages`}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue-100"
                      >
                        {i === 0 ? <Video size={15} strokeWidth={2} /> : <MessageSquare size={15} strokeWidth={2} />}
                        {i === 0 ? "Join" : "Prep"}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

          {/* Recent reviews */}
          <DashCard title="Recent reviews">
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-dashed divide-gray-200">
                {reviews.map((r, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span aria-label={`${r.rating} out of 5`}>
                        <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                        <span className="text-gray-300">{"★".repeat(5 - r.rating)}</span>
                      </span>
                      <span className="text-gray-500">
                        {r.booking.customer.businessName} · {reviewDate.format(r.createdAt)}
                      </span>
                    </div>
                    {r.writtenReview && (
                      <p className="mt-1.5 text-body leading-relaxed text-gray-700">{r.writtenReview}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DashCard>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Messages */}
          <DashCard title="Messages" action={{ label: "Open", href: "/advisor/messages" }}>
            {threads.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-dashed divide-gray-200">
                {threads.map((m) => (
                  <Link
                    key={m.bookingId}
                    href={`/bookings/${m.bookingId}/messages`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <Avatar name={m.booking.customer.businessName} src={m.booking.customer.user.avatarUrl} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{m.booking.customer.businessName}</p>
                        <span className="ws-mono shrink-0 text-2xs text-gray-400">{reviewDate.format(m.createdAt)}</span>
                      </div>
                      <p className="truncate text-sm text-gray-500">{m.body}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DashCard>

          {/* Availability */}
          <Card>
            <div className="flex items-start gap-3">
              <span className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                <CalendarClock size={20} strokeWidth={2} />
              </span>
              <div>
                <p className="text-body font-semibold text-ink">
                  {openSlots} open {openSlots === 1 ? "slot" : "slots"} this week
                </p>
                <p className="mt-0.5 text-sm text-gray-500">Add more to get booked faster.</p>
              </div>
            </div>
            <Link
              href="/advisor/availability"
              className="mt-4 flex w-full items-center justify-center rounded-md border border-gray-200 py-2.5 text-sm font-semibold text-ink transition hover:border-gray-300"
            >
              Manage availability
            </Link>
          </Card>

          {/* Coming your way */}
          <Card>
            <Eyebrow>Coming your way</Eyebrow>
            <p className="mt-2">
              <Money
                amountMinor={earnings.comingMinor}
                currency={earnings.currency || DEFAULT_CURRENCY}
                className="text-h2 font-bold text-ink"
              />
            </p>
            <p className="mt-1 text-sm text-gray-500">Releases after sessions complete.</p>
            <Link href="/advisor/earnings" className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline">
              Earnings
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
