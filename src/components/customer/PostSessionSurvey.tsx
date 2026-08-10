"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Star } from "lucide-react";
import { Button, Field, Textarea } from "@/components/ui";
import { cn } from "@/lib/cn";
import { submitReview } from "@/lib/actions/reviews";

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
    <form action={submitReview}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="rating" value={rating} />
      <input type="hidden" name="problemAddressed" value={addressed} />
      <input type="hidden" name="wouldRebook" value={rebook === null ? "" : String(rebook)} />

      <Field label="How was it?">
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="rounded-sm p-0.5 outline-none transition duration-DEFAULT ease-soft hover:scale-105 focus-visible:shadow-focus"
            >
              <Star
                size={32}
                className={cn(n <= rating ? "fill-amber-500 text-amber-500" : "text-gray-300")}
              />
            </button>
          ))}
        </div>
      </Field>

      <Field label="Did it address your problem?">
        <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
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
                "rounded-[10px] px-4 py-2 text-body font-semibold transition duration-DEFAULT ease-soft",
                addressed === o.v ? "bg-ink text-white shadow-ink-glow" : "text-gray-600 hover:text-ink",
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Would you book them again?">
        <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1">
          {[
            { v: true, l: "Yes" },
            { v: false, l: "No" },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setRebook(o.v)}
              className={cn(
                "rounded-[10px] px-5 py-2 text-body font-semibold transition duration-DEFAULT ease-soft",
                rebook === o.v ? "bg-ink text-white shadow-ink-glow" : "text-gray-600 hover:text-ink",
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

      <SubmitReviewButton disabled={!rating || !addressed || rebook === null} />
    </form>
  );
}

function SubmitReviewButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Submitting…" : "Submit review"}
    </Button>
  );
}
