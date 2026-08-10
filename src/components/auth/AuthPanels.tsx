import { BadgeCheck, ShieldCheck, Target } from "lucide-react";
import { Wordmark } from "@/components/ui/Wordmark";
import { Avatar } from "@/components/ui/Avatar";
import { Eyebrow } from "@/components/ui";

/**
 * Left brand panel for Sign in (1b): solid brand blue, white text, two soft
 * translucent circles bleeding off the corners, wordmark, and a testimonial.
 */
export function AuthBrandPanel() {
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
        <p className="text-body-lg font-medium leading-relaxed">
          &ldquo;Two sessions with Margaret saved us a supplier relationship — and
          about $40k.&rdquo;
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Avatar initials="JP" gradient="pink-amber" size={40} />
          <div className="text-sm">
            <p className="font-semibold">Jordan Park</p>
            <p className="text-white/70">Founder, Halcyon Goods</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Right value panel for Create account (1c): gray-50 with a left hairline,
 * "what you get" trio, and a small testimonial card.
 */
const PERKS = [
  { icon: BadgeCheck, tile: "bg-brand-blue-100 text-brand-blue", title: "Verified experts", body: "Identity- and reference-checked before they can take a booking." },
  { icon: Target, tile: "bg-brand-pink-100 text-brand-pink", title: "Bounded scope", body: "Fixed sessions, defined scope — no open-ended hours." },
  { icon: ShieldCheck, tile: "bg-[#e2f8fd] text-brand-cyan", title: "Insured sessions", body: "Every engagement is covered by our indemnity policy." },
];

export function AuthValuePanel() {
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
      <div className="mt-6 rounded-lg bg-white p-4 shadow-card">
        <p className="text-body text-ink">&ldquo;I had a shortlist in an afternoon.&rdquo;</p>
        <div className="mt-3 flex items-center gap-2.5">
          <Avatar initials="DL" gradient="cyan-green" size={32} />
          <p className="text-sm text-gray-500">Dana Liu · Retail</p>
        </div>
      </div>
    </div>
  );
}
