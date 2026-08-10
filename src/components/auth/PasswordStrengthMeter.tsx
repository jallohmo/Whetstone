import { cn } from "@/lib/cn";

/**
 * 4-segment password strength meter for the signup form. Purely a reflection of
 * the entered value — the authoritative minimum (8 chars) is still enforced
 * server-side in signUp(). Filled segments are green; the helper line names the
 * current level.
 */
export function scorePassword(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[0-9]/.test(pw) && /[a-zA-Z]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;

export function PasswordStrengthMeter({ password }: { password: string }) {
  const score = scorePassword(password);
  const helper =
    score === 0
      ? "At least 8 characters."
      : score >= 4
        ? "Strong — at least 8 characters."
        : `${LABELS[score]} — aim for 8+ characters with a number.`;

  return (
    <div className="mt-2">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-pill transition-colors duration-DEFAULT ease-soft",
              i < score ? "bg-green-500" : "bg-gray-150",
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-sm text-gray-500">{helper}</p>
    </div>
  );
}
