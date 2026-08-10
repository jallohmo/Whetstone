"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth";
import type { UserRole } from "@prisma/client";

export interface AuthFormState {
  error?: string;
}

/** Origin for building the email-confirmation callback URL. */
function siteOrigin(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * Sign in with email + password. Used by the login form (useFormState signature).
 * Returns { error } on failure; redirects on success.
 */
export async function signIn(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  const role = (data.user?.user_metadata?.role as UserRole | undefined) ?? "CUSTOMER";
  redirect(next || roleHome(role));
}

/**
 * Sign up as a CUSTOMER or ADVISOR. OPS_ADMIN can NEVER be created here — the
 * signup form only ever offers those two roles, the DB trigger coerces anything
 * else to CUSTOMER, and ops accounts are invite-only (scripts/create-ops-admin.ts).
 *
 * The role is passed in options.data.role -> lands in raw_user_meta_data ->
 * the handle_new_user trigger mirrors it into public.users.role server-side.
 */
export async function signUp(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedRole = String(formData.get("role") ?? "CUSTOMER");
  const role: UserRole = requestedRole === "ADVISOR" ? "ADVISOR" : "CUSTOMER";

  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(roleHome(role))}`,
    },
  });
  if (error) return { error: error.message };

  // If the project requires email confirmation, there's no session yet.
  if (!data.session) {
    redirect("/login?checkEmail=1");
  }
  redirect(roleHome(role));
}

export interface ResetRequestState {
  error?: string;
  sent?: boolean;
}

/**
 * Step 1 of password reset: email the user a recovery link. The link lands on
 * /auth/callback (type=recovery), which exchanges it for a short-lived session
 * and forwards to /reset-password. We always report success to avoid leaking
 * which emails have accounts.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password`,
  });
  // Only surface genuine configuration/transport errors, not "no such user".
  if (error && error.status && error.status >= 500) {
    return { error: error.message };
  }
  return { sent: true };
}

/**
 * Step 2 of password reset: set a new password. Requires the recovery session
 * established by the callback; without it Supabase rejects the update and the
 * page has already bounced the user back to /forgot-password.
 */
export async function updatePassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/login?reset=1");
}

/** Sign out and return to the landing page. */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
