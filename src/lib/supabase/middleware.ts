import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase session on every request and returns the user + a
 * response carrying the updated auth cookies. Route-group gating in
 * src/middleware.ts uses the returned user/role to decide access.
 *
 * Fails CLOSED, mirroring getCurrentUser() (src/lib/auth.ts): any infrastructure
 * error — missing env vars, Supabase unreachable — is logged and treated as "no
 * session" rather than allowed to escape. Middleware runs on EVERY route, so an
 * uncaught throw here 500s the entire site, public marketing pages included,
 * instead of degrading to logged-out. Returning a null user can only ever deny
 * access: the gates in src/middleware.ts redirect an absent user to login or
 * signup, so this never grants anything by accident.
 */
export async function updateSession(request: NextRequest) {
  try {
    return await readSession(request);
  } catch (err) {
    // console rather than reportError: middleware runs on the edge runtime,
    // where the Sentry/node integration in lib/observability isn't available.
    console.error("updateSession: failed to resolve the session —", err);
    return {
      response: NextResponse.next({ request }),
      user: null,
      role: null,
      mfaRequired: false,
    };
  }
}

async function readSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // role is mirrored into user_metadata by the auth trigger; the authoritative
  // copy lives in public.users and is what server-side permission checks read.
  const role = (user?.user_metadata?.role as string | undefined) ?? null;

  // Two-factor: if the user has a verified TOTP factor but has only completed
  // password auth (aal1), they must clear the second step. Derived from the
  // session's assurance level (local, no extra round-trip). Fails soft so an MFA
  // hiccup never locks a user out — only opted-in users are ever gated.
  let mfaRequired = false;
  if (user) {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      mfaRequired = data?.currentLevel === "aal1" && data?.nextLevel === "aal2";
    } catch {
      mfaRequired = false;
    }
  }

  return { response, user, role, mfaRequired };
}
