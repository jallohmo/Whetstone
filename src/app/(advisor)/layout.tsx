import Link from "next/link";
import { CalendarClock, Inbox, LayoutList, UserCheck, Wallet } from "lucide-react";

/**
 * Advisor shell (Screens 10-14). 264px white sidebar. Larger targets, plain
 * language, forgiving interactions — the audience spans a wide range of digital
 * fluency. Do NOT reuse the customer or ops visual language here.
 */
const nav = [
  { href: "/advisor/apply", label: "Application", icon: UserCheck },
  { href: "/advisor/verification-status", label: "Verification", icon: LayoutList },
  { href: "/advisor/availability", label: "Availability", icon: CalendarClock },
  { href: "/advisor/bookings", label: "Bookings", icon: Inbox },
  { href: "/advisor/earnings", label: "Earnings", icon: Wallet },
];

export default function AdvisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-gray-200 bg-white p-5 md:flex">
        <Link href="/" className="mb-8 block text-h3 font-bold tracking-tight text-ink">
          Whetstone
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-body text-gray-700 hover:bg-gray-100"
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
