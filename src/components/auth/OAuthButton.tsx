"use client";

import { useState, type ReactNode } from "react";
import type { Provider } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Shared "Continue with <provider>" OAuth button. Starts a real Supabase OAuth
 * redirect that returns to /auth/callback (which exchanges the code for a
 * session). If the provider isn't enabled on the Supabase project, the attempt
 * surfaces an inline error rather than pretending to work. Google and LinkedIn
 * are thin wrappers over this.
 */
export function OAuthButton({
  provider,
  label,
  icon,
  next,
}: {
  provider: Provider;
  label: string;
  icon: ReactNode;
  next?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
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
        <span className="inline-flex h-[18px] w-[18px] items-center justify-center" aria-hidden>
          {icon}
        </span>
        {pending ? "Redirecting…" : label}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
