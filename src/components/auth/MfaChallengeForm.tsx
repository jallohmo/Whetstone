"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";

/**
 * Second-factor challenge at sign-in. Lists the user's verified TOTP factor,
 * then challenge + verify the 6-digit code; on success the session upgrades to
 * aal2 (cookies updated by the client) and we continue to `next`.
 */
export function MfaChallengeForm({ next }: { next: string }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
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

  async function onSubmit(e: React.FormEvent) {
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

  if (ready && !factorId) return null;

  return (
    <>
      <form onSubmit={onSubmit}>
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
      {error && (
        <p className="mb-page-gap rounded-sm bg-red-100 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
        <Button type="submit" size="lg" className="w-full" disabled={pending || code.length < 6}>
          {pending ? "Verifying…" : "Verify"}
        </Button>
      </form>
      <div className="mt-4 text-center">
        <form action={signOut}>
          <button type="submit" className="text-sm font-medium text-gray-500 hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
