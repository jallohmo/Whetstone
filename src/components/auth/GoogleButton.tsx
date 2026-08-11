"use client";

import { OAuthButton } from "./OAuthButton";

/** "Continue with Google" — Supabase OAuth (see OAuthButton). */
export function GoogleButton({ next }: { next?: string }) {
  return (
    <OAuthButton
      provider="google"
      label="Continue with Google"
      next={next}
      icon={<span className="ws-mono text-base font-bold text-brand-blue">G</span>}
    />
  );
}
