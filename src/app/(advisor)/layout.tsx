import Link from "next/link";
import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AdvisorNav } from "@/components/advisor/AdvisorNav";
import { Wordmark } from "@/components/ui/Wordmark";
import { Avatar } from "@/components/ui/Avatar";

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-gray-150 bg-white p-5 md:flex">
        <Link href="/" aria-label="Whetstone home" className="mb-6 block transition hover:opacity-90">
          <Wordmark size="sm" />
        </Link>
        <p className="mb-3 px-3 text-2xs font-semibold uppercase tracking-[0.12em] text-gray-400">
          Advisor
        </p>
        <AdvisorNav />

        <div className="mt-auto flex items-center gap-3 border-t border-gray-150 pt-4">
          <Avatar name={handle} size={34} gradient="brand" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{handle}</p>
            <p className="truncate text-xs text-gray-500">Advisor</p>
          </div>
          <SignOutButton
            aria-label="Sign out"
            className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <LogOut size={18} strokeWidth={2} />
          </SignOutButton>
        </div>
      </aside>

      <main className="flex-1 px-6 py-8 md:px-[44px] md:py-[34px]">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
