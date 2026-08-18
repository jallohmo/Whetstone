import { cache } from "react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { SESSION_USER_HEADER } from "@/lib/supabase/session-header";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/observability";
import type { UserRole } from "@prisma/client";

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

/**
 * The name to show for a user. Prefers the first/last name they've set, then a
 * legacy single full name, and finally the local part of their email so there's
 * always something human-ish to render.
 */
export function displayName(u: {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  email: string;
}): string {
  const composed = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return composed || u.fullName?.trim() || u.email.split("@")[0];
}

/**
 * The id of the authenticated user, verified for THIS request.
 *
 * Middleware has already called supabase.auth.getUser() on every route that
 * renders and forwarded the verified id on SESSION_USER_HEADER, so the common
 * path reads a header instead of repeating a round trip to the Supabase auth
 * API — one of two such calls per page render, and the app's database and auth
 * both live a long way from the function region.
 *
 * The header cannot be spoofed: updateSession() deletes any inbound copy before
 * setting its own (see stripSessionHeader in lib/supabase/middleware.ts).
 *
 * Falls back to a full auth call whenever the header is absent — contexts where
 * middleware doesn't run, such as build-time rendering — so behaviour is
 * unchanged anywhere the fast path isn't available.
 */
async function verifiedUserId(): Promise<string | undefined> {
  try {
    const fromMiddleware = headers().get(SESSION_USER_HEADER);
    if (fromMiddleware) return fromMiddleware;
  } catch {
    // headers() throws outside a request scope; fall through to the auth call.
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id;
}

/**
 * The authenticated user for the current request, or null. Role comes from
 * public.users (the authoritative, server-written mirror) — never from
 * client-settable auth metadata. Wrapped in React cache() so multiple callers in
 * one render share a single lookup.
 *
 * Fails CLOSED: any infrastructure error (Supabase auth unreachable, database
 * connection refused/misconfigured) is logged and treated as "no session" rather
 * than allowed to throw. This keeps a DB blip from crashing every authenticated
 * render into an opaque "server-side exception" — callers/route gates see null and
 * degrade to the logged-out path (which denies access), never grant it by accident.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    const userId = (await verifiedUserId()) ?? null;
    if (!userId) return null;

    // Authoritative role/identity from our mirror table.
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });
    return row ?? null;
  } catch (err) {
    // Surfaced in server logs (and Sentry, once configured) so the real cause is
    // still diagnosable — the UI just degrades instead of white-screening.
    reportError("getCurrentUser: failed to resolve current user", err);
    return null;
  }
});

/** Home route for a role after login — the signed-in dashboard for each role. */
export function roleHome(role: UserRole): string {
  switch (role) {
    case "OPS_ADMIN":
      return "/ops";
    case "ADVISOR":
      return "/advisor";
    default:
      return "/home";
  }
}
