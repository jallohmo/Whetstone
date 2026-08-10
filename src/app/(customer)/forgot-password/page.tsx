import Link from "next/link";
import { AuthBrandPanel } from "@/components/auth/AuthPanels";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

// Step 1 of password reset — request a recovery email.
export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-[820px] py-6">
      <div className="grid overflow-hidden rounded-xl bg-white shadow-lg md:grid-cols-[340px_1fr]">
        <AuthBrandPanel />
        <div className="p-8 sm:p-10">
          <h1 className="text-h1 text-ink">Reset your password</h1>
          <p className="mt-2 text-body text-gray-500">
            Enter your email and we&apos;ll send a link to choose a new one.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-brand-blue hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
