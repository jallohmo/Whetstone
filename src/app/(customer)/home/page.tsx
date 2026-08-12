import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarClock,
  Mail,
  MessageSquare,
  Plus,
  Star,
  Users,
  Video,
} from "lucide-react";
import { Card, Eyebrow } from "@/components/ui";
import { Avatar } from "@/components/ui/Avatar";
import { Money } from "@/components/shared/Money";
import { DashCard } from "@/components/dashboard/DashCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { getCurrentUser, displayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLandingData } from "@/lib/featured";
import { greeting, firstNameOf, dominantCurrency } from "@/lib/dashboard";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { startVideoCall } from "@/lib/actions/video";

// Screen 1d — Client home. The signed-in landing for clients: a calm summary of
// their sessions, messages and a review nudge, deep-linking into the detail
// screens. Read-only except the "Join session" video action.
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-AU", {
  weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
});
const shortDate = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" });

function relativeDay(when: Date, now: Date): string {
  const days = Math.round((when.getTime() - now.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

const advisorSelect = {
  id: true,
  headline: true,
  avatarUrl: true,
  user: { select: { firstName: true, lastName: true, email: true, avatarUrl: true } },
} as const;

export default async function ClientHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/home");
  if (user.role === "ADVISOR") redirect("/advisor");
  if (user.role === "OPS_ADMIN") redirect("/ops");

  const now = new Date();
  const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

  const [profile, landing] = await Promise.all([
    prisma.customerProfile.findUnique({ where: { userId: user.id }, select: { id: true } }),
    getLandingData(),
  ]);

  let upcoming: Awaited<ReturnType<typeof loadUpcoming>> = [];
  let past: Awaited<ReturnType<typeof loadPast>> = [];
  let pendingReview: Awaited<ReturnType<typeof loadPendingReview>> = null;
  let threads: Awaited<ReturnType<typeof loadThreads>> = [];
  let advisorsWorkedWith = 0;
  let ytd: { amountCents: number; currency: string }[] = [];

  if (profile) {
    const cid = profile.id;
    [upcoming, past, pendingReview, threads, advisorsWorkedWith, ytd] = await Promise.all([
      loadUpcoming(cid, now),
      loadPast(cid, now),
      loadPendingReview(cid),
      loadThreads(cid),
      prisma.booking
        .findMany({ where: { customerId: cid }, select: { advisorId: true }, distinct: ["advisorId"] })
        .then((r) => r.length),
      prisma.payment.findMany({
        where: { booking: { customerId: cid, createdAt: { gte: yearStart } } },
        select: { amountCents: true, currency: true },
      }),
    ]);
  }

  const name = firstNameOf(displayName(user));
  const featured = landing.featured;
  const next = upcoming[0];
  const reviewsToLeave = pendingReview ? 1 : 0;

  const ytdCurrency = ytd.length ? dominantCurrency(ytd) : DEFAULT_CURRENCY;
  const ytdMinor = ytd.filter((p) => p.currency === ytdCurrency).reduce((s, p) => s + p.amountCents, 0);
  const ytdSessions = past.length + upcoming.length;

  const subParts: string[] = [];
  subParts.push(`${upcoming.length} ${upcoming.length === 1 ? "session" : "sessions"} coming up`);
  if (reviewsToLeave) subParts.push(`${reviewsToLeave} review to leave`);

  return (
    <div>
      {/* Greeting */}
      <div className="mb-page-gap flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h1 text-ink">
            {greeting(now)}, {name}
          </h1>
          <p className="mt-2 text-body-lg text-gray-500">
            You have{" "}
            <span className="font-semibold text-ink">{subParts.join(" and ")}</span>.
          </p>
        </div>
        <Link
          href="/needs/new"
          className="inline-flex items-center gap-2 rounded-pill bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px"
        >
          <Plus size={16} strokeWidth={2} /> Describe a new problem
        </Link>
      </div>

      {/* Stat strip */}
      <div className="mb-page-gap grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={CalendarClock}
          tileClass="bg-brand-blue-100 text-brand-blue"
          value={upcoming.length}
          label={upcoming.length === 1 ? "Upcoming session" : "Upcoming sessions"}
        />
        <StatCard
          icon={Users}
          tileClass="bg-green-100 text-green-700"
          value={advisorsWorkedWith}
          label={advisorsWorkedWith === 1 ? "Advisor worked with" : "Advisors worked with"}
        />
        <StatCard
          icon={Mail}
          tileClass="bg-brand-pink-100 text-brand-pink"
          value={threads.length}
          label={threads.length === 1 ? "Active conversation" : "Active conversations"}
        />
      </div>

      {/* Body grid */}
      <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-5">
          {/* Featured next session */}
          {next ? (
            <div
              className="rounded-xl p-card text-white"
              style={{ background: "linear-gradient(135deg,#2e45ff,#2233e6)", boxShadow: "0 12px 32px rgba(46,69,255,.28)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-semibold">
                  <CalendarClock size={14} strokeWidth={2} /> {relativeDay(next.scheduledAt, now)} ·{" "}
                  {dateTime.format(next.scheduledAt)}
                </span>
                <span className="text-sm text-white/70">
                  Session {next.sessionNo} of {next.sessionCount}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <Avatar name={next.advisorName} src={next.advisorAvatar} gradient="brand" size={52} ring />
                <div className="min-w-0">
                  <p className="text-h3 text-white">{next.advisorName}</p>
                  <p className="mt-0.5 truncate text-sm text-white/75">{next.topic}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <form action={startVideoCall}>
                  <input type="hidden" name="sessionId" value={next.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-brand-blue-600 transition hover:-translate-y-px"
                  >
                    <Video size={16} strokeWidth={2} /> Join session
                  </button>
                </form>
                <Link
                  href={`/bookings/${next.bookingId}/messages`}
                  className="inline-flex items-center gap-2 rounded-md bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
                >
                  <MessageSquare size={16} strokeWidth={2} /> Message
                </Link>
              </div>
            </div>
          ) : (
            <Card>
              <h2 className="text-h3 text-ink">Nothing booked yet</h2>
              <p className="mt-1.5 text-body text-gray-600">
                Describe what you&apos;re dealing with and we&apos;ll match you with a verified expert.
              </p>
              <Link
                href="/needs/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px"
              >
                Describe your problem <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </Card>
          )}

          {/* Upcoming sessions */}
          {upcoming.length > 0 && (
            <DashCard title="Upcoming sessions" action={{ label: "View all", href: "/bookings" }}>
              <div className="flex flex-col gap-2.5">
                {upcoming.map((s) => (
                  <Link
                    key={s.id}
                    href={`/bookings/${s.bookingId}/messages`}
                    className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                  >
                    <Avatar name={s.advisorName} src={s.advisorAvatar} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-ink">{s.advisorName}</p>
                      <p className="ws-mono mt-0.5 text-sm text-gray-500">{dateTime.format(s.scheduledAt)}</p>
                    </div>
                    <StatusPill status={s.status} />
                  </Link>
                ))}
              </div>
            </DashCard>
          )}

          {/* Past sessions */}
          {past.length > 0 && (
            <DashCard title="Past sessions" action={{ label: "View all", href: "/bookings" }}>
              <div className="flex flex-col divide-y divide-dashed divide-gray-200">
                {past.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <Avatar name={s.advisorName} src={s.advisorAvatar} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-semibold text-ink">{s.advisorName}</p>
                      <p className="truncate text-sm text-gray-500">
                        {s.topic} · {shortDate.format(s.scheduledAt)}
                      </p>
                    </div>
                    <Link
                      href={`/advisors/${s.advisorId}`}
                      className="shrink-0 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-gray-300"
                    >
                      Book again
                    </Link>
                  </div>
                ))}
              </div>
            </DashCard>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          {/* Leave a review */}
          {pendingReview && (
            <Card style={{ borderColor: "rgba(255,45,120,.28)" }}>
              <span className="inline-flex items-center rounded-pill bg-brand-pink-100 px-2.5 py-1 text-2xs font-semibold text-brand-pink">
                Action needed
              </span>
              <h2 className="mt-2.5 text-h3 text-ink">How did it go with {pendingReview.advisorName}?</h2>
              <p className="mt-1 text-sm text-gray-600">{pendingReview.topic}</p>
              <div className="mt-3 flex gap-1 text-gray-300">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={22} strokeWidth={2} />
                ))}
              </div>
              <Link
                href={`/bookings/${pendingReview.bookingId}/review`}
                className="mt-4 flex w-full items-center justify-center rounded-md bg-ink py-2.5 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px"
              >
                Leave a review
              </Link>
            </Card>
          )}

          {/* Messages */}
          <DashCard title="Messages" action={{ label: "Open", href: "/messages" }}>
            {threads.length === 0 ? (
              <p className="text-sm text-gray-500">No messages yet.</p>
            ) : (
              <div className="flex flex-col divide-y divide-dashed divide-gray-200">
                {threads.slice(0, 3).map((m) => (
                  <Link
                    key={m.bookingId}
                    href={`/bookings/${m.bookingId}/messages`}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <Avatar name={m.advisorName} src={m.advisorAvatar} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{m.advisorName}</p>
                        <span className="ws-mono shrink-0 text-2xs text-gray-400">{shortDate.format(m.createdAt)}</span>
                      </div>
                      <p className="truncate text-sm text-gray-500">{m.body}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DashCard>

          {/* Recommended */}
          {featured && (
            <DashCard title="Recommended for you">
              <div className="flex items-center gap-3">
                <Avatar name={featured.handle} src={featured.avatarUrl} gradient="brand" size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body font-semibold text-ink">{featured.handle}</p>
                  <p className="truncate text-sm text-gray-500">
                    {featured.headline ?? `${featured.yearsExperience} yrs' experience`}
                    {featured.avgRating != null && ` · ★ ${featured.avgRating.toFixed(1)}`}
                  </p>
                </div>
                <Link href={`/advisors/${featured.id}`} className="shrink-0 text-sm font-semibold text-brand-blue hover:underline">
                  View
                </Link>
              </div>
            </DashCard>
          )}

          {/* This year */}
          <Card>
            <Eyebrow>This year</Eyebrow>
            <p className="mt-2">
              <Money amountMinor={ytdMinor} currency={ytdCurrency} className="text-h2 font-bold text-ink" />
            </p>
            <p className="mt-1 text-sm text-gray-500">
              across {ytdSessions} {ytdSessions === 1 ? "session" : "sessions"}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const confirmed = status === "confirmed" || status === "in_progress";
  return (
    <span
      className={
        confirmed
          ? "shrink-0 rounded-pill bg-brand-blue-100 px-2.5 py-1 text-2xs font-semibold text-brand-blue-600"
          : "shrink-0 rounded-pill bg-amber-100 px-2.5 py-1 text-2xs font-semibold text-amber-700"
      }
    >
      {confirmed ? "Confirmed" : "Awaiting"}
    </span>
  );
}

// ---- Query helpers (kept close to the page; each returns view-ready rows). ----

async function loadUpcoming(customerId: string, now: Date) {
  const rows = await prisma.session.findMany({
    where: {
      scheduledAt: { gte: now },
      booking: { customerId, status: { in: ["confirmed", "in_progress"] } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 5,
    select: {
      id: true, scheduledAt: true,
      booking: {
        select: {
          id: true, status: true, sessionCount: true, scopeDescription: true,
          sessions: { orderBy: { scheduledAt: "asc" }, select: { id: true } },
          advisor: { select: advisorSelect },
        },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    scheduledAt: s.scheduledAt,
    bookingId: s.booking.id,
    status: s.booking.status,
    sessionCount: s.booking.sessionCount,
    sessionNo: s.booking.sessions.findIndex((x) => x.id === s.id) + 1,
    topic: s.booking.scopeDescription,
    advisorId: s.booking.advisor.id,
    advisorName: displayName(s.booking.advisor.user),
    advisorAvatar: s.booking.advisor.avatarUrl ?? s.booking.advisor.user.avatarUrl,
  }));
}

async function loadPast(customerId: string, now: Date) {
  const rows = await prisma.session.findMany({
    where: { scheduledAt: { lt: now }, booking: { customerId } },
    orderBy: { scheduledAt: "desc" },
    take: 3,
    select: {
      id: true, scheduledAt: true,
      booking: { select: { id: true, scopeDescription: true, advisor: { select: advisorSelect } } },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    scheduledAt: s.scheduledAt,
    topic: s.booking.scopeDescription,
    advisorId: s.booking.advisor.id,
    advisorName: displayName(s.booking.advisor.user),
    advisorAvatar: s.booking.advisor.avatarUrl ?? s.booking.advisor.user.avatarUrl,
  }));
}

async function loadPendingReview(customerId: string) {
  const b = await prisma.booking.findFirst({
    where: { customerId, status: "completed", review: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, scopeDescription: true, advisor: { select: advisorSelect } },
  });
  if (!b) return null;
  return {
    bookingId: b.id,
    topic: b.scopeDescription,
    advisorName: displayName(b.advisor.user),
  };
}

async function loadThreads(customerId: string) {
  const rows = await prisma.message.findMany({
    where: { booking: { customerId } },
    orderBy: { createdAt: "desc" },
    distinct: ["bookingId"],
    take: 6,
    select: {
      bookingId: true, body: true, createdAt: true,
      booking: { select: { advisor: { select: advisorSelect } } },
    },
  });
  return rows.map((m) => ({
    bookingId: m.bookingId,
    body: m.body,
    createdAt: m.createdAt,
    advisorName: displayName(m.booking.advisor.user),
    advisorAvatar: m.booking.advisor.avatarUrl ?? m.booking.advisor.user.avatarUrl,
  }));
}
