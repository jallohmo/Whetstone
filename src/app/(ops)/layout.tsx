import Link from "next/link";
import { AlertTriangle, GitCompareArrows, LayoutDashboard, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/auth/SignOutButton";

/**
 * Ops shell (Screens 15-18). Dark 212px rail, dense gray150 canvas, 13px base
 * font — an internal tool optimised for speed and keyboard use, NOT a consumer
 * screen. Deliberately unglamorous. Do NOT reuse customer/advisor styling.
 */
const nav = [
  { href: "/ops", label: "Queue", icon: LayoutDashboard },
  { href: "/ops/needs", label: "Matching", icon: GitCompareArrows },
  { href: "/ops/advisors", label: "Verification", icon: ShieldCheck },
  { href: "/ops/disputes", label: "Disputes", icon: AlertTriangle },
];

export default function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-150 text-[13px]">
      <aside className="hidden w-[212px] shrink-0 flex-col bg-gray-900 p-3 text-gray-300 md:flex">
        <div className="mb-6 px-2 pt-2 text-sm font-bold tracking-tight text-white">
          Whetstone Ops
        </div>
        <nav className="flex flex-col gap-0.5">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
        <SignOutButton className="mt-auto rounded-sm px-2.5 py-2 text-left text-gray-300 hover:bg-gray-800 hover:text-white" />
      </aside>
      <main className="flex-1 overflow-x-auto px-5 py-6">{children}</main>
    </div>
  );
}
