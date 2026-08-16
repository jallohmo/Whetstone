import "server-only";
import { createHash } from "crypto";
import { reportError } from "@/lib/observability";

/**
 * Leaked-password protection.
 *
 * Supabase Auth offers this natively, but only on the Pro plan; this project is
 * on Free, so the same check runs in the application instead. It is the same
 * source Supabase uses — the HaveIBeenPwned Pwned Passwords corpus — reached
 * through their free range API, which needs no key.
 *
 * PRIVACY (k-anonymity): the password is never sent anywhere. We SHA-1 it
 * locally, send only the first FIVE hex characters of the digest, and receive
 * every leaked suffix sharing that prefix (typically ~500-1000 of them). The
 * comparison happens here. HIBP cannot tell which candidate — or even which of
 * their own hashes — was being asked about.
 *
 * SHA-1 is not a security choice: it is the corpus's index. The digest never
 * leaves this process and is never stored.
 */

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range";

/** How long to wait before giving up and letting the password through. */
const TIMEOUT_MS = 2500;

export interface BreachCheck {
  /** True only when the password was positively found in the corpus. */
  breached: boolean;
  /** How many times it appears. 0 when clean or when the check couldn't run. */
  count: number;
  /** True when the lookup failed and the result is "unknown", not "clean". */
  degraded: boolean;
}

/**
 * Check a password against the Pwned Passwords corpus.
 *
 * FAILS OPEN by design: a network error, a timeout, or a bad response returns
 * `{ breached: false, degraded: true }`. An HIBP outage must not stop people
 * from signing up or, worse, from changing a password they are trying to rotate
 * because it was compromised. Callers that care can inspect `degraded`.
 */
export async function checkPasswordBreached(password: string): Promise<BreachCheck> {
  if (!password) return { breached: false, count: 0, degraded: false };

  const digest = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = digest.slice(0, 5);
  const suffix = digest.slice(5);

  try {
    const response = await fetch(`${HIBP_RANGE_URL}/${prefix}`, {
      headers: {
        // Asks HIBP to pad the response with decoy hashes, so the size of the
        // reply cannot hint at how many real matches the prefix has.
        "Add-Padding": "true",
        "User-Agent": "Whetstone-Auth",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      reportError("checkPasswordBreached: HIBP returned a non-OK status", null, {
        status: response.status,
      });
      return { breached: false, count: 0, degraded: true };
    }

    const body = await response.text();
    for (const line of body.split("\n")) {
      const [hashSuffix, countText] = line.trim().split(":");
      if (hashSuffix !== suffix) continue;
      const count = Number.parseInt(countText ?? "0", 10);
      // Padding entries are returned with a count of 0 — a real hit never is.
      if (!Number.isFinite(count) || count <= 0) break;
      return { breached: true, count, degraded: false };
    }

    return { breached: false, count: 0, degraded: false };
  } catch (err) {
    reportError("checkPasswordBreached: HIBP lookup failed", err);
    return { breached: false, count: 0, degraded: true };
  }
}

/**
 * The message shown when a password is rejected. Deliberately explains WHY
 * without implying we know anything about this particular user — the password
 * appeared in a third-party breach corpus, not necessarily in one of ours.
 */
export function breachedPasswordMessage(count: number): string {
  const appearances =
    count >= 1000 ? `${Math.round(count / 1000)},000+ times` : `${count} times`;
  return (
    `This password has appeared ${appearances} in known data breaches, so it's ` +
    `unsafe to use here. Please choose a different one.`
  );
}
