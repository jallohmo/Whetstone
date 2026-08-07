import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

/**
 * Customer shell (Screens 1-9). Canvas gray100, centered white "pill" top bar,
 * max-width 1180. Deliberately calm and low cognitive load — this audience is
 * time-poor and phone-first, not power users. Do NOT unify with advisor/ops shells.
 */
export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-shell px-4 pt-5">
        <header className="mx-auto flex max-w-shell items-center justify-between rounded-pill border border-gray-200 bg-white px-5 py-3 shadow-card">
          <Link href="/" className="text-h3 font-bold tracking-tight text-ink">
            Whetstone
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {user ? (
              <SignOutButton className="rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100" />
            ) : (
              <>
                <Link href="/advisor/apply" className="rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100">
                  Become an advisor
                </Link>
                <Link href="/login" className="rounded-md px-3 py-2 text-gray-600 hover:bg-gray-100">
                  Sign in
                </Link>
              </>
            )}
            <Link
              href="/needs/new"
              className="rounded-md bg-ink px-4 py-2 font-semibold text-white shadow-ink-glow transition hover:-translate-y-px"
            >
              Describe your problem
            </Link>
          </nav>
        </header>
      </div>
      <main className="mx-auto max-w-shell px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-shell px-4 pb-10 pt-6 text-sm text-gray-400">
        Verified, insured, bounded advisory sessions — in any industry, anywhere.
      </footer>
    </div>
  );
}
