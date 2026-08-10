import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Wordmark } from "@/components/ui/Wordmark";
import { ProfileMenu } from "@/components/shared/ProfileMenu";

/**
 * Customer shell (Screens 1-9). Canvas gray100, centered white "pill" top bar,
 * max-width 1180. Deliberately calm and low cognitive load — this audience is
 * time-poor and phone-first, not power users. Do NOT unify with advisor/ops shells.
 *
 * The pill nav carries the wordmark on the left and the auth affordance on the
 * right: ghost "Sign in" + ink "Get started" when logged out; "Sign out" + a
 * gradient avatar chip when logged in (screens 7-9). The landing page renders its
 * own fuller marketing nav (How it works / Advisors / Pricing) within its hero.
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
        <header className="mx-auto flex max-w-shell items-center justify-between rounded-pill bg-white py-3 pl-[22px] pr-[14px] shadow-card">
          <Link href="/" aria-label="Whetstone home" className="transition hover:opacity-90">
            <Wordmark />
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {user ? (
              <ProfileMenu
                role="customer"
                displayName={user.fullName ?? user.email.split("@")[0]}
                email={user.email}
                avatarUrl={user.avatarUrl}
              />
            ) : (
              <>
                <Link
                  href="/advisor/apply"
                  className="hidden rounded-md px-3 py-2 font-medium text-gray-600 transition hover:bg-gray-100 sm:block"
                >
                  Become an advisor
                </Link>
                <Link
                  href="/login"
                  className="rounded-md px-3 py-2 font-medium text-gray-600 transition hover:bg-gray-100"
                >
                  Sign in
                </Link>
                <Link
                  href="/needs/new"
                  className="ml-1 rounded-pill bg-ink px-5 py-2.5 font-semibold text-white shadow-ink-glow transition hover:-translate-y-px hover:shadow-ink-glow-lg"
                >
                  Get started
                </Link>
              </>
            )}
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
