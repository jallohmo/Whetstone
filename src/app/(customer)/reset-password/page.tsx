import { redirect } from "next/navigation";
import { AuthBrandPanel } from "@/components/auth/AuthPanels";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Step 2 of password reset — set a new password. Reached via the recovery link,
// which the /auth/callback handler exchanges for a session before landing here.
// No session (link expired or opened directly) → back to step 1.
export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/forgot-password");

  return (
    <div className="mx-auto max-w-[820px] py-6">
      <div className="grid overflow-hidden rounded-xl bg-white shadow-lg md:grid-cols-[340px_1fr]">
        <AuthBrandPanel />
        <div className="p-8 sm:p-10">
          <h1 className="text-h1 text-ink">Choose a new password</h1>
          <p className="mt-2 text-body text-gray-500">
            You&apos;re signed in from your reset link. Set a new password to finish.
          </p>
          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
