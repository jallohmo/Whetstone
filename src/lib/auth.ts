import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
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
  if (!row) return null;
  return row;
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
