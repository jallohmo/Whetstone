import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { AdvisorNav } from "@/components/advisor/AdvisorNav";
import { Wordmark } from "@/components/ui/Wordmark";
import { ProfileMenu } from "@/components/shared/ProfileMenu";
import { prisma } from "@/lib/prisma";

/**
 * Advisor shell (Screens 10-14). 264px white rail with a 1px right border on a
 * gray-50 canvas. Larger targets, plain language, forgiving interactions — the
 * audience spans a wide range of digital fluency. Do NOT reuse the customer or
 * ops visual language here.
 */
export default async function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const handle = user?.email?.split("@")[0] ?? "advisor";
  const profile = user
    ? await prisma.advisorProfile.findUnique({
        where: { userId: user.id },
        select: { id: true, avatarUrl: true, verificationStatus: true },
      })
    : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-gray-150 bg-white p-5 md:flex">
        <Link href="/" aria-label="Whetstone home" className="mb-6 block transition hover:opacity-90">
          <Wordmark size="sm" />
        </Link>

        {user ? (
          // Signed-in advisor: full dashboard nav + profile chip.
          <>
            <p className="mb-3 px-3 text-2xs font-semibold uppercase tracking-[0.12em] text-gray-400">
              Advisor
            </p>
            <AdvisorNav />

            <div className="mt-auto border-t border-gray-150 pt-4">
              <ProfileMenu
                role="advisor"
                displayName={handle}
                email={user.email}
                avatarUrl={profile?.avatarUrl ?? user.avatarUrl}
                verified={profile?.verificationStatus === "VERIFIED"}
                publicProfileId={profile?.id}
              />
            </div>
          </>
        ) : (
          // Logged-out prospect (only reachable on /advisor/apply): a slim shell —
          // no dashboard nav or profile chip until they have an account.
          <div className="mt-auto border-t border-gray-150 pt-4">
            <p className="text-sm text-gray-500">
              Already an advisor?{" "}
              <Link
                href="/login?next=/advisor/verification-status"
                className="font-semibold text-brand-blue hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </aside>

      <main className="flex-1 px-6 py-8 md:px-[44px] md:py-[34px]">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
