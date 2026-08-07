import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card } from "@/components/ui";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser, roleHome } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Sign in with Supabase Auth (email + password). Already-authenticated users are
// bounced to their role home.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; checkEmail?: string; error?: string };
}) {
  const user = await getCurrentUser();
  if (user) redirect(searchParams.next || roleHome(user.role));

  return (
    <div className="mx-auto max-w-sm">
      <PageHeader title="Sign in" />

      {searchParams.checkEmail && (
        <div className="mb-page-gap rounded-lg border border-green-500/30 bg-green-100 p-4 text-sm text-green-700">
          Check your email for a confirmation link, then come back and sign in.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-page-gap rounded-lg border border-red-500/30 bg-red-100 p-4 text-sm text-red-700">
          We couldn&apos;t sign you in from that link. Try again below.
        </div>
      )}

      <Card>
        <AuthForm mode="signin" next={searchParams.next} />
      </Card>

      <p className="mt-6 text-center text-sm text-gray-500">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-brand-blue hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
