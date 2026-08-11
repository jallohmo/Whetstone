"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { redeemRecoveryCode } from "@/lib/actions/mfa";
import { createClient } from "@/lib/supabase/client";

/**
 * Second-factor challenge at sign-in. Verify the 6-digit TOTP code (session
 * upgrades to aal2), or fall back to a single-use recovery code — which removes
 * the factor so a user who lost their authenticator can get in and re-enrol.
 */
export function MfaChallengeForm({ next }: { next: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactorId(data?.totp?.find((f) => f.status === "verified")?.id ?? null);
      setReady(true);
    });
  }, []);

  // Nothing to verify (no verified factor) — continue on.
  useEffect(() => {
    if (ready && !factorId) router.replace(next);
  }, [ready, factorId, next, router]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Couldn't start the check. Try again.");
      setPending(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (verifyError) {
      setError("That code didn't match. Check your authenticator app and try again.");
      setPending(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onRecovery(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const res = await redeemRecoveryCode(recovery);
    if (!res.ok) {
      setError(res.error ?? "That recovery code isn't valid.");
      setPending(false);
      return;
    }
    // Factor removed — session no longer requires the second step.
    router.push(next);
    router.refresh();
  }

  if (ready && !factorId) return null;

  return (
    <>
      {mode === "totp" ? (
        <form onSubmit={onVerify}>
          <Field label="Authentication code" hint="Enter the 6-digit code from your authenticator app.">
            <Input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </Field>
          {error && <p className="mb-page-gap rounded-sm bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending || code.length < 6}>
            {pending ? "Verifying…" : "Verify"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onRecovery}>
          <Field label="Recovery code" hint="Enter one of the single-use codes you saved. This turns 2FA off so you can sign in.">
            <Input
              name="recovery"
              autoComplete="off"
              required
              autoFocus
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
              placeholder="xxxxx-xxxxx"
            />
          </Field>
          {error && <p className="mb-page-gap rounded-sm bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending || recovery.trim().length < 6}>
            {pending ? "Checking…" : "Use recovery code"}
          </Button>
        </form>
      )}

      <div className="mt-4 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode((m) => (m === "totp" ? "recovery" : "totp"));
          }}
          className="font-semibold text-brand-blue hover:underline"
        >
          {mode === "totp" ? "Use a recovery code" : "Use your authenticator"}
        </button>
        <form action={signOut}>
          <button type="submit" className="font-medium text-gray-500 hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
