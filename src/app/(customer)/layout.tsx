import Link from "next/link";
import { getCurrentUser, displayName } from "@/lib/auth";
import { Wordmark } from "@/components/ui/Wordmark";
import { ProfileMenu } from "@/components/shared/ProfileMenu";
import { CustomerNav } from "@/components/customer/CustomerNav";
import { MessageBell } from "@/components/shared/MessageBell";
import { unreadTotal } from "@/lib/thread-reads";

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
  // Only clients get a client bell. Advisors and ops can reach this shell (the
  // landing page lives in it), and pointing them at /messages would just bounce
  // them back to their own dashboard.
  const unread = user?.role === "CUSTOMER" ? await unreadTotal(user.id) : 0;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-shell px-4 pt-5">
        <header className="mx-auto flex max-w-shell items-center justify-between rounded-pill bg-white py-3 pl-[22px] pr-[14px] shadow-card">
          <Link
            href={user ? "/home" : "/"}
            aria-label="Whetstone home"
            className="transition hover:opacity-90"
          >
            <Wordmark />
          </Link>
          {user && <CustomerNav />}
          <nav className="flex items-center gap-1 text-sm">
            {user?.role === "CUSTOMER" && (
              // In the shell rather than on one page, so it follows the client
              // around — a bell only in one place is a bell you have to go and
              // look at.
              <MessageBell
                count={unread}
                href="/messages"
                className="mr-1 h-10 w-10 hover:bg-gray-100"
              />
            )}
            {user ? (
              <ProfileMenu
                role="customer"
                displayName={displayName(user)}
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
