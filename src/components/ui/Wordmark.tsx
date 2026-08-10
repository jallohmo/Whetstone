import { cn } from "@/lib/cn";

/**
 * The Whetstone wordmark: a two-dot glyph (8px blue + 8px cyan) followed by
 * "Whetstone" in General Sans 700. Used in the customer pill nav, advisor
 * sidebar, and auth brand panels. The glyph is a placeholder for a real logo
 * mark if/when one exists (see the design handoff, "Assets").
 *
 * `tone="onDark"` inverts the wordmark text to white for use on the blue/ink
 * brand panels; the dots keep their brand colours.
 */
export function Wordmark({
  size = "md",
  tone = "default",
  className,
}: {
  size?: "sm" | "md" | "lg";
  tone?: "default" | "onDark";
  className?: string;
}) {
  const text = {
    sm: "text-[17px]",
    md: "text-[19px]",
    lg: "text-[22px]",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="inline-flex items-center gap-1" aria-hidden>
        <span className="h-2 w-2 rounded-pill bg-brand-blue" />
        <span className="h-2 w-2 rounded-pill bg-brand-cyan" />
      </span>
      <span
        className={cn(
          "font-bold tracking-[-0.02em]",
          text,
          tone === "onDark" ? "text-white" : "text-ink",
        )}
      >
        Whetstone
      </span>
    </span>
  );
}
