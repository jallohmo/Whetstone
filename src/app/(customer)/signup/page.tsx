import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card } from "@/components/ui";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser, roleHome } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Customer signup. Advisors sign up through /advisor/apply (role=ADVISOR);
// OPS accounts are invite-only and never created from a public page.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(searchParams.next || roleHome(user.role));

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Create your account" subtitle="Book verified, insured advisory sessions." />
      <Card>
        <AuthForm mode="signup" role="CUSTOMER" next={searchParams.next} />
      </Card>
      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-blue hover:underline">
          Sign in
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-gray-400">
        Want to advise instead?{" "}
        <Link href="/advisor/apply" className="font-semibold text-brand-blue hover:underline">
          Become an advisor
        </Link>
      </p>
    </div>
  );
}
