import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AuthBrandPanel } from "@/components/auth/AuthPanels";
import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";
import { getCurrentUser } from "@/lib/auth";
import { getMfaStatus } from "@/lib/mfa";

export const dynamic = "force-dynamic";

// Second-factor step at sign-in. Reached when a signed-in user has a verified
// TOTP factor but the session is still aal1 (enforced in middleware).
export default async function MfaPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // No factor enrolled → nothing to do here.
  const { enabled } = await getMfaStatus();
  const next = searchParams.next || "/";
  if (!enabled) redirect(next);

  return (
    <div className="mx-auto max-w-[820px] py-6">
      <div className="grid overflow-hidden rounded-xl bg-white shadow-lg md:grid-cols-[340px_1fr]">
        <AuthBrandPanel />
        <div className="p-8 sm:p-10">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-blue-100 text-brand-blue">
            <ShieldCheck size={22} strokeWidth={2} />
          </span>
          <h1 className="mt-4 text-h1 text-ink">Two-factor check</h1>
          <p className="mt-2 text-body text-gray-500">
            Your account has two-factor authentication on. Enter the code from your
            authenticator app to continue.
          </p>
          <div className="mt-6">
            <MfaChallengeForm next={next} />
          </div>
        </div>
      </div>
    </div>
  );
}
