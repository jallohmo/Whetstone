import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthValuePanel } from "@/components/auth/AuthPanels";
import { getCurrentUser, roleHome } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Screen 1c — Customer signup. Split-panel card: form left, value panel right
// (mirror of sign-in). Advisors sign up through /advisor/apply (role=ADVISOR);
// OPS accounts are invite-only and never created from a public page.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(searchParams.next || roleHome(user.role));

  return (
    <div className="mx-auto max-w-[820px] py-6">
      <div className="grid overflow-hidden rounded-xl bg-white shadow-lg md:grid-cols-[1fr_340px]">
        <div className="p-8 sm:p-10">
          <h1 className="text-h1 text-ink">Create your account</h1>
          <p className="mt-2 text-body text-gray-500">
            Free to join. Create an account to describe your problem and get a
            hand-picked shortlist of verified, insured advisors.
          </p>

          <div className="mt-6">
            <AuthForm mode="signup" role="CUSTOMER" next={searchParams.next} />
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href={
                searchParams.next
                  ? `/login?next=${encodeURIComponent(searchParams.next)}`
                  : "/login"
              }
              className="font-semibold text-brand-blue hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-sm text-gray-400">
            Want to advise instead?{" "}
            <Link href="/advisor/apply" className="font-semibold text-brand-blue hover:underline">
              Become an advisor
            </Link>
          </p>
        </div>
        <AuthValuePanel />
      </div>
    </div>
  );
}
