"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button, Field, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";

/**
 * Screen 9 / PostSessionSurvey (B3, C2). Quick rating + structured questions
 * (problem addressed y/partial/n, would rebook y/n) written to a schema designed
 * to support later categorisation — problemCategory stays nullable at MVP but the
 * structured shape matters now that the industry spread is wide.
 */
export function PostSessionSurvey({ bookingId }: { bookingId: string }) {
  const [rating, setRating] = useState(0);
  const [addressed, setAddressed] = useState<string>("");
  const [rebook, setRebook] = useState<boolean | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // TODO(build-time): Server Action writes Review + OutcomeSurvey for bookingId.
      }}
    >
      <Field label="How was it?">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-1"
            >
              <Star
                size={28}
                className={cn(n <= rating ? "fill-amber-500 text-amber-500" : "text-gray-300")}
              />
            </button>
          ))}
        </div>
      </Field>

      <Field label="Did it address your problem?">
        <div className="flex gap-2">
          {[
            { v: "yes", l: "Yes" },
            { v: "partially", l: "Partially" },
            { v: "no", l: "No" },
          ].map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setAddressed(o.v)}
              className={cn(
                "rounded-md border px-4 py-2 text-body font-semibold",
                addressed === o.v ? "border-ink bg-ink text-white" : "border-gray-200 bg-white text-ink",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Would you book them again?">
        <div className="flex gap-2">
          {[
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setRebook(o.v)}
              className={cn(
                "rounded-md border px-4 py-2 text-body font-semibold",
                rebook === o.v ? "border-ink bg-ink text-white" : "border-gray-200 bg-white text-ink",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Anything else? (optional)">
        <Textarea name="freeTextContext" rows={3} placeholder="Context that would help us match better next time…" />
      </Field>

      <Button type="submit" disabled={!rating || !addressed || rebook === null}>
        Submit review
      </Button>
    </form>
  );
}
