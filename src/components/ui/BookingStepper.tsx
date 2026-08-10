import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * The customer booking-flow stepper (screens 2–7): Describe → Match → Book →
 * Confirm. Current step is a 22px ink circle with its number; completed steps
 * are ink circles with a check; future steps are gray-150 circles. Connectors
 * are dashed gray-300 hairlines.
 *
 * Screen → step mapping (per the handoff): Describe (2), Match (3–4), Book
 * (5–6), Confirm (7 = all complete → pass `current="done"`).
 */
const STEPS = [
  { key: "describe", label: "Describe" },
  { key: "match", label: "Match" },
  { key: "book", label: "Book" },
  { key: "confirm", label: "Confirm" },
] as const;

type StepKey = (typeof STEPS)[number]["key"] | "done";

export function BookingStepper({ current }: { current: StepKey }) {
  const currentIndex = current === "done" ? STEPS.length : STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2" aria-label="Booking progress">
      {STEPS.map((step, i) => {
        const state = i < currentIndex ? "complete" : i === currentIndex ? "current" : "upcoming";
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2 last:flex-none">
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-[22px] w-[22px] items-center justify-center rounded-pill text-2xs font-semibold",
                  state === "upcoming"
                    ? "bg-gray-150 text-gray-500"
                    : "bg-ink text-white",
                )}
                aria-current={state === "current" ? "step" : undefined}
              >
                {state === "complete" ? <Check size={13} strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  state === "upcoming" ? "text-gray-400" : "text-ink",
                )}
              >
                {step.label}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 border-t border-dashed border-gray-300" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
