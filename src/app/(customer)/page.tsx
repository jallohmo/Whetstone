import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Play, ShieldCheck, Target } from "lucide-react";
import { Eyebrow } from "@/components/ui";
import { Avatar, AvatarGroup } from "@/components/ui/Avatar";
import { Money } from "@/components/shared/Money";
import { getLandingData } from "@/lib/featured";
import { getCurrentUser } from "@/lib/auth";

// Screen 1 — Landing/homepage.
// Plain-spoken, "describe your problem" entry point. Weathered and credible,
// not wellness-soft and not consulting-slick. The hero's "top match" preview and
// social proof are driven by REAL platform data (see lib/featured), with honest
// fallbacks before there's data to show.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  // Signed-in clients get their dashboard, not the marketing pitch. Advisors and
  // ops keep access to the public landing (their own shells live elsewhere).
  const user = await getCurrentUser();
  if (user?.role === "CUSTOMER") redirect("/home");

  const { featured, ring, matchedCount } = await getLandingData();

  return (
    <div className="flex flex-col gap-16">
      {/* Hero */}
      <section className="grid items-center gap-14 py-8 lg:grid-cols-2 lg:py-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-pill bg-brand-blue-100 px-3.5 py-1.5 text-sm font-semibold text-brand-blue-600">
            <span className="h-1.5 w-1.5 rounded-pill bg-brand-blue" />
            Verified · insured · bounded scope
          </span>
          <h1 className="mt-5 text-[40px] font-bold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[54px]">
            Advice from people who&apos;ve actually done it.
          </h1>
          <p className="mt-5 max-w-md text-body-lg leading-relaxed text-gray-600">
            Whetstone matches you with semi-retired experts in your industry for
            bounded, insured advisory sessions — on pricing, cash flow, compliance,
            operations and the transitions that keep you up at night.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/needs/new"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-6 py-3.5 text-body-lg font-semibold text-white shadow-ink-glow-lg transition duration-DEFAULT ease-soft hover:-translate-y-px"
            >
              Describe your problem
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-6 py-3.5 text-body-lg font-semibold text-ink transition duration-DEFAULT ease-soft hover:-translate-y-px hover:border-gray-300"
            >
              <Play size={16} className="text-brand-blue" strokeWidth={2} />
              How it works
            </a>
          </div>
          <div className="mt-8 flex items-center gap-3">
            {ring.length > 0 && (
              <AvatarGroup>
                {ring.map((m, i) => (
                  <Avatar key={i} initials={m.initials} src={m.src} size={36} ring />
                ))}
              </AvatarGroup>
            )}
            <p className="text-sm text-gray-600">
              {matchedCount > 0 ? (
                <>
                  <span className="font-semibold text-ink">
                    {matchedCount.toLocaleString()} {matchedCount === 1 ? "owner" : "owners"}
                  </span>{" "}
                  matched with an expert
                </>
              ) : (
                "Be one of the first owners matched with an expert."
              )}
            </p>
          </div>
        </div>

        {/* Floating "Top match" preview card, with a second card peeking behind it. */}
        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <div
            className="absolute -bottom-4 -right-3.5 left-6 top-6 rounded-xl border border-gray-200 bg-white opacity-60 shadow-card"
            aria-hidden
          />
          {featured ? (
            <div className="relative rounded-xl bg-white p-6 shadow-float">
              <div className="flex items-center justify-between">
                <Eyebrow>Top match</Eyebrow>
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                  <BadgeCheck size={14} strokeWidth={2} />
                  Verified
                </span>
              </div>
              <div className="mt-4 flex items-start gap-4">
                <Avatar name={featured.handle} src={featured.avatarUrl} gradient="brand" size={60} />
                <div className="min-w-0">
                  <p className="text-h3 text-ink">{featured.handle}</p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {featured.headline ?? `${featured.yearsExperience} years' experience`}
                  </p>
                  <p className="mt-1.5 text-sm text-gray-700">
                    {featured.avgRating != null && (
                      <>
                        <span className="text-amber-500">★</span> {featured.avgRating.toFixed(1)} ·{" "}
                      </>
                    )}
                    {featured.sessionCount > 0 && `${featured.sessionCount} sessions · `}
                    {featured.yearsExperience} yrs
                  </p>
                </div>
              </div>
              <div className="my-5 border-t border-dashed border-gray-300" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Focus</p>
                  <p className="mt-0.5 text-body font-semibold text-ink">
                    {featured.focus ?? "Your industry"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Package</p>
                  <p className="mt-0.5 text-body font-semibold text-ink">
                    {featured.packageLabel ?? "Bounded · insured"}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <p className="text-body">
                  {featured.priceCents != null && featured.currency ? (
                    <>
                      <Money
                        amountMinor={featured.priceCents}
                        currency={featured.currency}
                        className="font-semibold text-ink"
                      />
                      <span className="text-gray-500"> / package</span>
                    </>
                  ) : (
                    <span className="text-gray-500">Insured session</span>
                  )}
                </p>
                <Link
                  href={`/advisors/${featured.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px"
                >
                  View profile
                  <ArrowRight size={15} strokeWidth={2} />
                </Link>
              </div>
            </div>
          ) : (
            // No verified advisors yet — a genuine invitation, not a fake person.
            <div className="relative rounded-xl bg-white p-6 shadow-float">
              <Eyebrow>How matching works</Eyebrow>
              <p className="mt-4 text-h3 text-ink">Tell us the problem. We find the person.</p>
              <p className="mt-2 text-body text-gray-600">
                Describe what you&apos;re dealing with and our team hand-picks verified
                experts who&apos;ve solved exactly it — no directory to trawl, no
                open-ended hours.
              </p>
              <Link
                href="/needs/new"
                className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition duration-DEFAULT ease-soft hover:-translate-y-px"
              >
                Describe your problem
                <ArrowRight size={15} strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Feature trio */}
      <section className="grid gap-5 md:grid-cols-3">
        {[
          {
            icon: BadgeCheck,
            tile: "bg-brand-blue-100 text-brand-blue",
            title: "Verified experience",
            body: "Every advisor is identity-checked and reference-verified before they can take a booking.",
          },
          {
            icon: Target,
            tile: "bg-brand-pink-100 text-brand-pink",
            title: "Bounded scope",
            body: "Fixed session count, defined scope. You know exactly what you're booking — no open-ended hours.",
          },
          {
            icon: ShieldCheck,
            tile: "bg-[#e2f8fd] text-brand-cyan",
            title: "Insured sessions",
            body: "Every engagement is covered by our professional indemnity policy.",
          },
        ].map(({ icon: Icon, tile, title, body }) => (
          <div key={title} className="rounded-xl bg-white p-card shadow-card">
            <span
              className={`inline-flex h-11 w-11 items-center justify-center rounded-md ${tile}`}
            >
              <Icon size={22} strokeWidth={2} />
            </span>
            <h3 className="mt-4 text-h3 text-ink">{title}</h3>
            <p className="mt-2 text-body text-gray-600">{body}</p>
          </div>
        ))}
      </section>

      {/* How it works — dark band */}
      <section
        id="how-it-works"
        className="scroll-mt-24 rounded-xl bg-ink p-8 text-white sm:p-11"
      >
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <Eyebrow tone="blue-300">How it works</Eyebrow>
            <h2 className="mt-3 max-w-lg text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-display3">
              From stuck to a plan in three steps
            </h2>
          </div>
          <Link
            href="/needs/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/25 px-5 py-3 text-body font-semibold text-white transition duration-DEFAULT ease-soft hover:bg-white/10"
          >
            Describe your problem
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Describe your problem",
              body: "Plain language, no account needed. Tell us the industry and what's actually going on.",
            },
            {
              n: "02",
              title: "Meet your matches",
              body: "We hand-pick a short list of verified experts who've dealt with exactly this.",
            },
            {
              n: "03",
              title: "Book an insured session",
              body: "Fixed scope, fixed price, covered by our policy. Payment is held until you've met.",
            },
          ].map(({ n, title, body }) => (
            <div key={n} className="rounded-lg bg-gray-800 p-6">
              <p className="ws-mono text-h3 font-bold text-brand-blue/70">{n}</p>
              <h3 className="mt-3 text-h3 text-white">{title}</h3>
              <p className="mt-2 text-body text-gray-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
