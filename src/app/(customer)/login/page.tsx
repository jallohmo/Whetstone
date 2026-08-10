import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthBrandPanel } from "@/components/auth/AuthPanels";
import { getCurrentUser, roleHome } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Screen 1b — Sign in with Supabase Auth (email + password). Split-panel card:
// brand panel left, form right. Already-authenticated users bounce to role home.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; checkEmail?: string; error?: string; reset?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(searchParams.next || roleHome(user.role));

  return (
    <div className="mx-auto max-w-[820px] py-6">
      <div className="grid overflow-hidden rounded-xl bg-white shadow-lg md:grid-cols-[340px_1fr]">
        <AuthBrandPanel />
        <div className="p-8 sm:p-10">
          <h1 className="text-h1 text-ink">Welcome back</h1>
          <p className="mt-2 text-body text-gray-500">
            Sign in to book sessions and message your advisors.
          </p>

          {searchParams.checkEmail && (
            <div className="mt-5 rounded-lg border border-green-500/30 bg-green-100 p-4 text-sm text-green-700">
              Check your email for a confirmation link, then come back and sign in.
            </div>
          )}
          {searchParams.reset && (
            <div className="mt-5 rounded-lg border border-green-500/30 bg-green-100 p-4 text-sm text-green-700">
              Your password is updated — sign in with your new one.
            </div>
          )}
          {searchParams.error && (
            <div className="mt-5 rounded-lg border border-red-500/30 bg-red-100 p-4 text-sm text-red-700">
              We couldn&apos;t sign you in from that link. Try again below.
            </div>
          )}

          <div className="mt-6">
            <AuthForm mode="signin" next={searchParams.next} />
          </div>

          <p className="mt-6 text-sm text-gray-500">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-brand-blue hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
