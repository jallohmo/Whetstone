"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { keysForRole } from "@/lib/notifications";

export interface AccountFormState {
  error?: string;
  ok?: boolean;
}

/**
 * Customer "Personal information" (9c). Name/phone live on User; business name on
 * the CustomerProfile when one exists (a customer who hasn't booked yet has none,
 * and we don't fabricate an industry just to store a business name).
 */
export async function updateProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to update your profile." };

  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();

  await prisma.user.update({
    where: { id: user.id },
    data: { fullName: fullName || null, phone: phone || null },
  });

  if (businessName) {
    await prisma.customerProfile.updateMany({
      where: { userId: user.id },
      data: { businessName },
    });
  }

  revalidatePath("/account");
  return { ok: true };
}

/**
 * Advisor "Public profile" (14c). Edits the SAME AdvisorProfile shown on the
 * public profile (screen 4) and match cards (screen 3) — but, unlike the initial
 * application, it does NOT reset verification. A verified advisor stays verified.
 */
export async function updateAdvisorProfile(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADVISOR") return { error: "Advisors only." };

  const headline = String(formData.get("headline") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const yearsRaw = String(formData.get("yearsExperience") ?? "").trim();
  const years = yearsRaw ? parseInt(yearsRaw, 10) : NaN;
  const specialtyIds = formData.getAll("specialtyIds").map((v) => String(v));

  if (!bio) return { error: "Add a short bio for your public profile." };

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return { error: "Complete your application first." };

  await prisma.advisorProfile.update({
    where: { id: profile.id },
    data: {
      headline: headline || null,
      bio,
      ...(Number.isNaN(years) ? {} : { yearsExperience: years }),
      ...(specialtyIds.length ? { specialtyTags: { set: specialtyIds.map((id) => ({ id })) } } : {}),
    },
  });

  revalidatePath("/advisor/account");
  revalidatePath(`/advisors/${profile.id}`);
  return { ok: true };
}

/**
 * Change password for a signed-in user (9c/14c Security). Verifies the current
 * password by re-authenticating, then sets the new one. The 8-char minimum
 * matches signup.
 */
export async function changePassword(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < 8) return { error: "Use a new password of at least 8 characters." };
  if (next !== confirm) return { error: "The new passwords don't match." };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sign in to change your password." };

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (verifyError) return { error: "Your current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };

  return { ok: true };
}

/**
 * Persist a newly-uploaded avatar. Stored on User for the account/nav chip; for
 * advisors it's mirrored onto AdvisorProfile so the public profile (screen 4) and
 * match cards use the same photo. The file itself is uploaded client-side to the
 * public `avatars` bucket first (see AvatarUploader).
 */
export async function setAvatarUrl(url: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to update your photo.");

  await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: url || null } });
  if (user.role === "ADVISOR") {
    await prisma.advisorProfile.updateMany({
      where: { userId: user.id },
      data: { avatarUrl: url || null },
    });
  }
  revalidatePath("/account");
  revalidatePath("/advisor/account");
}

/** Revert to the gradient/initials fallback by clearing the stored avatar. */
export async function removeAvatar(): Promise<void> {
  await setAvatarUrl("");
}

/**
 * Notification preferences (9c/14c). Reads the role's known keys from the form
 * (a checked toggle submits its key) and writes the boolean map to User.
 */
export async function updateNotificationPrefs(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sign in to update notifications.");

  const prefs: Record<string, boolean> = {};
  for (const k of keysForRole(user.role)) {
    prefs[k.key] = formData.get(k.key) != null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { notificationPrefs: prefs },
  });
  revalidatePath("/account");
  revalidatePath("/advisor/account");
}

/**
 * Advisor "Leave the platform" (14c). Soft-deactivation: hides the profile from
 * matches/search/booking and blocks new bookings, but keeps the record and lets
 * the advisor reactivate. Blocked while there are still active bookings to honour.
 */
export async function deactivateAdvisor(): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADVISOR") return { error: "Advisors only." };

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) return { error: "No advisor profile found." };

  const active = await prisma.booking.count({
    where: { advisorId: profile.id, status: { in: ["pending_payment", "confirmed", "in_progress"] } },
  });
  if (active > 0) {
    return { error: `You have ${active} active booking${active === 1 ? "" : "s"} to complete or cancel first.` };
  }

  await prisma.advisorProfile.update({
    where: { id: profile.id },
    data: { deactivatedAt: new Date() },
  });
  revalidatePath("/advisor/account");
  return { ok: true };
}

/** Reverse a deactivation — the profile becomes bookable again. */
export async function reactivateAdvisor(): Promise<AccountFormState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADVISOR") return { error: "Advisors only." };
  await prisma.advisorProfile.updateMany({
    where: { userId: user.id },
    data: { deactivatedAt: null },
  });
  revalidatePath("/advisor/account");
  return { ok: true };
}

/**
 * Customer account deletion (9c). Permanent and irreversible. Deliberately
 * conservative: blocked while there are active bookings, and refused outright if
 * the account has any booking history — those carry payment/audit records we must
 * retain (the user is told to contact support for that case). For a clean account
 * it detaches any guest needs, deletes the profile + mirror row, and removes the
 * auth user via the service role, then signs out.
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in first." };
  if (user.role !== "CUSTOMER") return { error: "Only client accounts can be deleted here." };

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (profile) {
    const bookingCount = await prisma.booking.count({ where: { customerId: profile.id } });
    if (bookingCount > 0) {
      return {
        error:
          "Your account has booking history we're required to keep. Contact support to close it.",
      };
    }
  }

  // Clean account: detach guest needs (preserve ops match records), drop the
  // profile and the mirror row.
  await prisma.$transaction(async (tx) => {
    if (profile) {
      await tx.need.updateMany({ where: { customerId: profile.id }, data: { customerId: null } });
      await tx.customerProfile.delete({ where: { id: profile.id } });
    }
    await tx.user.delete({ where: { id: user.id } });
  });

  // Remove the auth user (best-effort — the mirror is already gone, so access is
  // revoked regardless).
  try {
    const admin = createServiceRoleClient();
    await admin.auth.admin.deleteUser(user.id);
  } catch {
    /* mirror row already deleted; the account can no longer be used */
  }

  const supabase = createClient();
  await supabase.auth.signOut().catch(() => {});
  redirect("/");
}

/** Advisor payout schedule preference (14c). */
export async function setPayoutSchedule(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADVISOR") throw new Error("Advisors only.");

  await prisma.advisorProfile.updateMany({
    where: { userId: user.id },
    data: { weeklyPayouts: formData.get("weeklyPayouts") != null },
  });
  revalidatePath("/advisor/account");
}
