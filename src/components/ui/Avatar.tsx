import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/**
 * Gradient monogram avatar — the production `Avatar` renders a real photo when
 * one exists and falls back to a gradient initials chip. This component is the
 * fallback/monogram used throughout the refresh (match cards, nav chips, message
 * bubbles, sidebar footer). Swap `src` in when photos are wired.
 *
 * Gradients follow the design handoff's persona presets; pass `gradient` to pin
 * one, otherwise a stable preset is chosen from the initials so the same person
 * keeps the same colour.
 */
const GRADIENTS = {
  brand: "linear-gradient(135deg,#2e45ff,#17c4e8)", // advisor GC
  "pink-amber": "linear-gradient(135deg,#ff2d78,#ff9f1c)", // rita.ops RO
  "purple-blue": "linear-gradient(135deg,#7c5cff,#2e45ff)", // customer AR
  "blue-300": "linear-gradient(135deg,#2e45ff,#8fa2ff)",
  "cyan-green": "linear-gradient(135deg,#17c4e8,#21c45d)",
} as const;

export type AvatarGradient = keyof typeof GRADIENTS;

const PRESET_ORDER: AvatarGradient[] = [
  "brand",
  "purple-blue",
  "pink-amber",
  "cyan-green",
  "blue-300",
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pickGradient(seed: string): AvatarGradient {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PRESET_ORDER[Math.abs(hash) % PRESET_ORDER.length];
}

export function Avatar({
  name,
  initials,
  size = 40,
  gradient,
  ring = false,
  className,
}: {
  /** Display name — used to derive initials and a stable gradient. */
  name?: string;
  /** Override the derived initials (e.g. a handle's monogram). */
  initials?: string;
  /** Pixel diameter. */
  size?: number;
  gradient?: AvatarGradient;
  /** 2px white ring — used when avatars overlap in a group. */
  ring?: boolean;
  className?: string;
}) {
  const label = initials ?? initialsOf(name ?? "?");
  const bg = GRADIENTS[gradient ?? pickGradient(label)];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-pill font-semibold text-white",
        ring && "ring-2 ring-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.36),
      }}
      aria-hidden
    >
      {label}
    </span>
  );
}

/**
 * Overlapping avatar row (social proof / participant stacks). Children should be
 * <Avatar ring /> elements; they overlap by -10px in source order.
 */
export function AvatarGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center [&>*:not(:first-child)]:-ml-2.5", className)}>
      {children}
    </span>
  );
}
