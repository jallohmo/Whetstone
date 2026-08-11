"use client";

import { OAuthButton } from "./OAuthButton";

/**
 * "Continue with LinkedIn" — Supabase OAuth via the `linkedin_oidc` provider
 * (see OAuthButton). Requires the LinkedIn provider to be enabled on the
 * Supabase project; otherwise the click surfaces an inline error.
 */
export function LinkedInButton({ next }: { next?: string }) {
  return (
    <OAuthButton
      provider="linkedin_oidc"
      label="Continue with LinkedIn"
      next={next}
      icon={<LinkedInMark />}
    />
  );
}

function LinkedInMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" role="img" aria-label="LinkedIn">
      <path
        fill="#0A66C2"
        d="M22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0zM7.12 20.45H3.56V9h3.56v11.45zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zm15.11 13.02h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29z"
      />
    </svg>
  );
}
