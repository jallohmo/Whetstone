import { cn } from "@/lib/cn";

/**
 * The Whetstone wordmark: the rounded-square logo mark (a blue→cyan "sharpening
 * stroke" over two rails) followed by "Whetstone" in General Sans 700. Used in
 * the customer pill nav, advisor sidebar, and auth brand panels.
 *
 * `tone="onDark"` inverts the wordmark TEXT to white for the blue/ink brand
 * panels; the mark itself is a white tile that already reads on dark.
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

  const mark = { sm: 22, md: 26, lg: 30 }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={mark} />
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

/** The standalone logo mark (also used as the favicon / app icon). */
export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="wsGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2E45FF" />
          <stop offset="1" stopColor="#17C4E8" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="104" height="104" rx="30" fill="#ffffff" stroke="#111114" strokeWidth="6" />
      <line x1="38" y1="52" x2="82" y2="52" stroke="#B9C2FF" strokeWidth="7" strokeLinecap="round" />
      <line x1="38" y1="70" x2="82" y2="70" stroke="#B9C2FF" strokeWidth="7" strokeLinecap="round" />
      <line x1="42" y1="82" x2="78" y2="40" stroke="url(#wsGrad)" strokeWidth="12" strokeLinecap="round" />
    </svg>
  );
}
