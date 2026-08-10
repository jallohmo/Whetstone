import { createClient } from "@/lib/supabase/server";

/**
 * Two-factor (TOTP) status for the signed-in user, read server-side for the
 * account Security card. Fails soft: any error (MFA not enabled on the project,
 * transient failure) reads as "not enabled" so the page never crashes.
 */
export async function getMfaStatus(): Promise<{ enabled: boolean; factorId: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return { enabled: false, factorId: null };
    const verified = data.totp?.find((f) => f.status === "verified") ?? null;
    return { enabled: Boolean(verified), factorId: verified?.id ?? null };
  } catch {
    return { enabled: false, factorId: null };
  }
}
