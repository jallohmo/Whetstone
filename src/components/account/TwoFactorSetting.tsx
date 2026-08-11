"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { regenerateRecoveryCodes, clearRecoveryCodes } from "@/lib/actions/mfa";

/**
 * Two-factor (TOTP) control in the Security card. Fully wired to Supabase MFA:
 * enrol shows a QR + secret, verifying a 6-digit code activates the factor;
 * turning it off unenrols. Status is read server-side and passed in; after any
 * change we refresh so the server view updates.
 */
export function TwoFactorSetting({
  enabled,
  factorId,
}: {
  enabled: boolean;
  factorId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (error || !data) {
      setError(
        error?.message?.includes("not enabled")
          ? "Two-factor isn't enabled on this project yet. Turn on TOTP in Supabase → Authentication → MFA."
          : error?.message ?? "Couldn't start setup.",
      );
      return;
    }
    setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmEnroll() {
    if (!enroll) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enroll.factorId,
    });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? "Couldn't verify. Try again.");
      setBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enroll.factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    if (verifyError) {
      setBusy(false);
      setError("That code didn't match. Try the current one from your app.");
      return;
    }
    // Freshly enabled — issue recovery codes to show once.
    try {
      const { codes } = await regenerateRecoveryCodes();
      setRecoveryCodes(codes);
    } catch {
      /* non-fatal: 2FA is on even if codes couldn't be issued */
    }
    setBusy(false);
    setEnroll(null);
    setCode("");
    router.refresh();
  }

  async function regenerate() {
    setBusy(true);
    setError(null);
    try {
      const { codes } = await regenerateRecoveryCodes();
      setRecoveryCodes(codes);
    } catch {
      setError("Couldn't generate recovery codes.");
    }
    setBusy(false);
  }

  async function cancelEnroll() {
    if (enroll) {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId }).catch(() => {});
    }
    setEnroll(null);
    setCode("");
    setError(null);
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    await clearRecoveryCodes().catch(() => {});
    setRecoveryCodes(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="border-t border-dashed border-gray-300 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-body font-semibold text-ink">Two-factor authentication</p>
            {enabled && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-green-100 px-2 py-0.5 text-2xs font-semibold text-green-700">
                <Check size={12} strokeWidth={2.5} /> On
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            Require a code from your authenticator app at sign-in.
          </p>
        </div>

        {enabled ? (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={regenerate}
              disabled={busy}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-ink transition hover:border-gray-300 disabled:opacity-50"
            >
              Recovery codes
            </button>
            <button
              type="button"
              onClick={disable}
              disabled={busy}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-gray-300 disabled:opacity-50"
            >
              {busy ? "…" : "Turn off"}
            </button>
          </div>
        ) : (
          !enroll && (
            <button
              type="button"
              onClick={startEnroll}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px disabled:opacity-50"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Set up
            </button>
          )
        )}
      </div>

      {enroll && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-600">
            Scan this with your authenticator app (or enter the key), then type the
            6-digit code to confirm.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enroll.qr} alt="Two-factor QR code" className="h-36 w-36 rounded-md bg-white p-2" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Setup key</p>
              <p className="ws-mono mt-1 break-all text-sm text-ink">{enroll.secret}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Code</label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-[140px]"
              />
            </div>
            <button
              type="button"
              onClick={confirmEnroll}
              disabled={busy || code.length < 6}
              className="rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-ink-glow transition hover:-translate-y-px disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Confirm"}
            </button>
            <button type="button" onClick={cancelEnroll} className="px-2 py-2.5 text-sm font-semibold text-gray-500 hover:text-ink">
              Cancel
            </button>
          </div>
        </div>
      )}

      {recoveryCodes && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-100/60 p-4">
          <p className="text-body font-semibold text-ink">Save your recovery codes</p>
          <p className="mt-0.5 text-sm text-gray-600">
            Each code works once. Keep them somewhere safe — if you lose your
            authenticator, a code lets you sign in and turn 2FA back off. This is the
            only time they&apos;re shown.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {recoveryCodes.map((c) => (
              <span key={c} className="ws-mono text-sm text-ink">{c}</span>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-gray-300"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => setRecoveryCodes(null)}
              className="text-sm font-semibold text-gray-600 hover:text-ink"
            >
              I&apos;ve saved them
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
