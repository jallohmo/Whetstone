"use client";

import { OAuthButton } from "./OAuthButton";

/** "Continue with Google" — Supabase OAuth (see OAuthButton). */
export function GoogleButton({ next }: { next?: string }) {
  return (
    <OAuthButton
      provider="google"
      label="Continue with Google"
      next={next}
      icon={<GoogleMark />}
    />
  );
}

/** Official four-colour Google "G" mark. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" role="img" aria-label="Google">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.11-6.7-4.94H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.31A7.2 7.2 0 0 1 4.92 12c0-.8.14-1.58.38-2.31V6.6H1.29A11.99 11.99 0 0 0 0 12c0 1.94.46 3.77 1.29 5.4l4.01-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A11.99 11.99 0 0 0 1.29 6.6l4.01 3.09C6.24 6.86 8.88 4.75 12 4.75z"
      />
    </svg>
  );
}
