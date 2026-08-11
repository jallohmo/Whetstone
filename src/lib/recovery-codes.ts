import { createHash, randomBytes } from "crypto";

/**
 * 2FA recovery codes. Codes are high-entropy random strings shown to the user
 * exactly once at enrolment; only their SHA-256 hashes are stored. High entropy
 * means a fast hash (not bcrypt) is appropriate — there's nothing to brute-force.
 */
const CODE_COUNT = 10;

/** Format: 10 chars of base32-ish, grouped `xxxxx-xxxxx`, e.g. "7bk2p-q9m4t". */
function makeCode(): string {
  const raw = randomBytes(8).toString("base64url").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10).padEnd(10, "0");
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: CODE_COUNT }, makeCode);
}

/** Normalise (case/space/dash-insensitive) then hash for storage/compare. */
export function hashRecoveryCode(code: string): string {
  const normalised = code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return createHash("sha256").update(normalised).digest("hex");
}
