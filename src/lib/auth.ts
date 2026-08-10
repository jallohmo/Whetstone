import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/observability";
import type { UserRole } from "@prisma/client";

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
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
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // Authoritative role/identity from our mirror table.
    const row = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, role: true },
    });
    return row ?? null;
  } catch (err) {
    // Surfaced in server logs (and Sentry, once configured) so the real cause is
    // still diagnosable — the UI just degrades instead of white-screening.
    reportError("getCurrentUser: failed to resolve current user", err);
    return null;
  }
});

/** Home route for a role after login. */
export function roleHome(role: UserRole): string {
  switch (role) {
    case "OPS_ADMIN":
      return "/ops";
    case "ADVISOR":
      return "/advisor/verification-status";
    default:
      return "/";
  }
}
