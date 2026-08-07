import Link from "next/link";
import { BadgeCheck, ShieldCheck, Target } from "lucide-react";

// Screen 1 — Landing/homepage.
// Plain-spoken, "describe your problem" entry point. Weathered and credible,
// not wellness-soft and not consulting-slick.
export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-display2 text-ink">
          Advice from people who&apos;ve actually done it.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-body-lg text-gray-600">
          Whetstone connects you with semi-retired and retired experts — in your
          industry, whatever it is — for bounded, insured advisory sessions on the
          real problems: pricing, cash flow, compliance, operations, transitions.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/needs/new"
            className="rounded-md bg-ink px-6 py-3 text-body font-semibold text-white shadow-ink-glow transition hover:-translate-y-px"
          >
            Describe your problem
          </Link>
          <Link
            href="/advisor/apply"
            className="rounded-md border border-gray-200 bg-white px-6 py-3 text-body font-semibold text-ink transition hover:border-gray-300"
          >
            Become an advisor
          </Link>
        </div>
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-3">
        {[
          { icon: BadgeCheck, title: "Verified experience", body: "Every advisor is identity-checked and reference-verified before they can take a booking." },
          { icon: Target, title: "Bounded scope", body: "Fixed session count, defined scope. You know exactly what you're booking — no open-ended hours." },
          { icon: ShieldCheck, title: "Insured sessions", body: "Every engagement is covered by our professional indemnity policy." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-gray-200 bg-white p-card shadow-card">
            <Icon size={22} className="text-ink" strokeWidth={2} />
            <h3 className="mt-3 text-h3 text-ink">{title}</h3>
            <p className="mt-2 text-body text-gray-600">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
