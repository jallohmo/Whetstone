import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Used on advisor profiles and match cards. Compact, honest, no inflation. */
export function ReviewSummary({
  rating,
  count,
}: {
  rating: number | null;
  count: number;
}) {
  if (!rating || count === 0) {
    return <span className="text-sm text-gray-400">No reviews yet</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-ink">
      <span className="inline-flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={14}
            className={cn(i < Math.round(rating) ? "fill-amber-500 text-amber-500" : "text-gray-300")}
          />
        ))}
      </span>
      <span className="font-mono font-semibold">{rating.toFixed(1)}</span>
      <span className="text-gray-500">({count})</span>
    </span>
  );
}
