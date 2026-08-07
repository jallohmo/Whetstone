/** Tiny className joiner — no runtime dependency needed at MVP scale. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
