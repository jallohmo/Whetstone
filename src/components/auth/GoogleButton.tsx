"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * "Continue with Google" — a real OAuth start via Supabase. Redirects to Google,
 * which returns to /auth/callback (the existing handler exchanges the code for a
 * session). If the Google provider isn't enabled on the Supabase project, the
 * attempt surfaces an inline error rather than pretending to work.
 */
export function GoogleButton({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2.5 rounded-md border border-gray-200 bg-white px-4 py-2.5 text-body font-semibold text-ink outline-none transition duration-DEFAULT ease-soft hover:border-gray-300 focus-visible:shadow-focus disabled:opacity-50"
      >
        <span className="ws-mono text-base font-bold text-brand-blue" aria-hidden>
          G
        </span>
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
