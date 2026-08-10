import { BadgeCheck, ShieldCheck, Target } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Avatar } from "@/components/ui/Avatar";
import { Eyebrow } from "@/components/ui";
import { getFeaturedTestimonial } from "@/lib/featured";

/**
 * Left brand panel for Sign in (1b): solid brand blue, white text, two soft
 * translucent circles bleeding off the corners, wordmark, and — when a real
 * customer review exists — a genuine testimonial. With no reviews yet it shows a
 * plain brand line rather than a fabricated quote.
 */
export async function AuthBrandPanel() {
  const testimonial = await getFeaturedTestimonial();

  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-blue p-8 text-white md:flex">
      <span
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-pill bg-white/10"
        aria-hidden
      />
      <span
        className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-pill bg-brand-cyan/35"
        aria-hidden
      />
      <div className="relative">
        <Wordmark tone="onDark" />
      </div>
      <div className="relative">
        {testimonial ? (
          <>
            <p className="text-body-lg font-medium leading-relaxed">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar initials={testimonial.initials} gradient={testimonial.gradient} size={40} />
              <div className="text-sm">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-white/70">{testimonial.meta}</p>
              </div>
            </div>
          </>
        ) : (
          <p className="max-w-xs text-body-lg font-medium leading-relaxed">
            Bounded, insured advisory sessions with people who&apos;ve actually run a
            business before.
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Right value panel for Create account (1c): gray-50 with a left hairline,
 * "what you get" trio, and — when available — a real review at the bottom.
 */
const PERKS = [
  { icon: BadgeCheck, tile: "bg-brand-blue-100 text-brand-blue", title: "Verified experts", body: "Identity- and reference-checked before they can take a booking." },
  { icon: Target, tile: "bg-brand-pink-100 text-brand-pink", title: "Bounded scope", body: "Fixed sessions, defined scope — no open-ended hours." },
  { icon: ShieldCheck, tile: "bg-[#e2f8fd] text-brand-cyan", title: "Insured sessions", body: "Every engagement is covered by our indemnity policy." },
];

export async function AuthValuePanel() {
  const testimonial = await getFeaturedTestimonial();

  return (
    <div className="hidden flex-col justify-between border-l border-gray-200 bg-gray-50 p-8 md:flex">
      <div>
        <Eyebrow>What you get</Eyebrow>
        <ul className="mt-5 flex flex-col gap-5">
          {PERKS.map(({ icon: Icon, tile, title, body }) => (
            <li key={title} className="flex gap-3">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${tile}`}>
                <Icon size={16} strokeWidth={2} />
              </span>
              <div>
                <p className="text-body font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {testimonial ? (
        <div className="mt-6 rounded-lg bg-white p-4 shadow-card">
          <p className="text-body text-ink">&ldquo;{testimonial.quote}&rdquo;</p>
          <div className="mt-3 flex items-center gap-2.5">
            <Avatar initials={testimonial.initials} gradient={testimonial.gradient} size={32} />
            <p className="text-sm text-gray-500">
              {testimonial.name} · {testimonial.meta}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg bg-white p-4 shadow-card">
          <p className="text-body text-ink">
            No account needed to see your matches — you only sign up when you decide
            to book.
          </p>
        </div>
      )}
    </div>
  );
}
