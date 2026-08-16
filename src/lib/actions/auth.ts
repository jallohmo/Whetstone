"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getCurrentUser, roleHome } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { prisma } from "@/lib/prisma";
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
  const next = safeNext(formData.get("next"));

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
  // Signup-first funnel: someone who clicked "Describe your business challenge" arrives via
  // /signup?next=/needs/new and must land back there, not on the generic home.
  const next = safeNext(formData.get("next"));
  const destination = next || roleHome(role);

  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role },
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(destination)}`,
    },
  });
  if (error) return { error: error.message };

  // If the project requires email confirmation, there's no session yet. Carry the
  // destination through so the intent survives the round trip via email.
  if (!data.session) {
    const checkEmail = next
      ? `/login?checkEmail=1&next=${encodeURIComponent(next)}`
      : "/login?checkEmail=1";
    redirect(checkEmail);
  }
  redirect(destination);
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

/**
 * Post-OAuth role selection for advisors. Google (and any OAuth) sign-ups land as
 * CUSTOMER because the redirect flow can't pass a role into the signup trigger.
 * This lets such a user opt into the ADVISOR role from /advisor/apply.
 *
 * Role is written in BOTH places it lives: public.users.role (authoritative, via
 * the service role since RLS blocks a self-update of role) and the JWT's
 * user_metadata.role (what the route-gating middleware reads). Refused for OPS and
 * for a customer account that already has bookings.
 */
export async function becomeAdvisor(): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  if (user.role === "ADVISOR") return {};
  if (user.role === "OPS_ADMIN") return { error: "Ops accounts can't become advisors." };

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (profile) {
    const bookings = await prisma.booking.count({ where: { customerId: profile.id } });
    if (bookings > 0) {
      return { error: "This account has client bookings — use a different email to advise." };
    }
  }

  const admin = createServiceRoleClient();
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADVISOR" } });
  // Keep the JWT role in sync (middleware gates /advisor/* on it), preserving any
  // provider-populated metadata (name, avatar_url, …).
  const { data: existing } = await admin.auth.admin.getUserById(user.id);
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(existing?.user?.user_metadata ?? {}), role: "ADVISOR" },
  });

  revalidatePath("/advisor/apply");
  return {};
}

/** Sign out and return to the landing page. */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}
