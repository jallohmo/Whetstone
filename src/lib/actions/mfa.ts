"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/recovery-codes";

/**
 * Generate a fresh set of 2FA recovery codes, store only their hashes, and return
 * the plaintext ONCE for the user to save. Called right after enrolling a TOTP
 * factor, and from "Regenerate codes". Replaces any previous set.
 */
export async function regenerateRecoveryCodes(): Promise<{ codes: string[] }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to manage recovery codes.");

  const codes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaRecoveryCodes: codes.map(hashRecoveryCode) },
  });
  return { codes };
}

/** Clear stored recovery codes (called when the user turns 2FA off). */
export async function clearRecoveryCodes(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryCodes: [] } });
}

/**
 * Recovery path for a lost authenticator. Verifies a single-use code, then removes
 * the user's TOTP factor via the service role — dropping the session's required
 * level back to aal1 so they can proceed and re-enrol. The consumed code (and, once
 * the factor is gone, the whole set) is cleared.
 */
export async function redeemRecoveryCode(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { mfaRecoveryCodes: true },
  });
  const hashes = row?.mfaRecoveryCodes ?? [];
  const hash = hashRecoveryCode(code);
  if (!hashes.includes(hash)) {
    return { ok: false, error: "That recovery code isn't valid." };
  }

  // Remove the user's verified TOTP factor(s) via the service role (admin bypass —
  // an aal1 session can't remove its own factor, which is the point of 2FA).
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const factors = data?.totp?.filter((f) => f.status === "verified") ?? [];
    const admin = createServiceRoleClient();
    for (const f of factors) {
      await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: user.id });
    }
  } catch {
    return { ok: false, error: "Couldn't complete recovery. Contact support." };
  }

  // 2FA is now off — clear the whole set (moot until re-enrolment).
  await prisma.user.update({ where: { id: user.id }, data: { mfaRecoveryCodes: [] } });
  return { ok: true };
}
