import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card } from "@/components/ui";
import { VerificationBadge } from "@/components/shared/VerificationBadge";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Screen 11 — Verification status view. Reads the signed-in advisor's real status.
// Plain-language copy, never the raw enum. Application-level state, not an auth gate.
export const dynamic = "force-dynamic";

const COPY: Record<string, string> = {
  PENDING:
    "We're reviewing your application. This usually takes a few days — we'll email you the moment there's news. You don't need to do anything right now.",
  VERIFIED:
    "You're verified. Your profile is live and you can start taking bookings. Set your availability so customers can book you.",
  NEEDS_MORE_INFO:
    "We need a little more from you before we can verify you. Add the missing details and resubmit.",
  REJECTED:
    "We weren't able to verify your application this time. Your email has the details.",
};

export default async function VerificationStatusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/verification-status");

  const profile = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { verificationStatus: true, specialtyTags: { select: { name: true } } },
  });

  // Advisor account with no profile yet -> send them to the application.
  if (!profile) redirect("/advisor/apply");

  const status = profile.verificationStatus;

  return (
    <div>
      <PageHeader title="Your verification" />
      <Card>
        <VerificationBadge status={status} />
        <p className="mt-4 text-body-lg text-gray-700">{COPY[status]}</p>

        {status === "NEEDS_MORE_INFO" && (
          <Link
            href="/advisor/apply"
            className="mt-4 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-ink-glow"
          >
            Add missing details
          </Link>
        )}
        {status === "VERIFIED" && (
          <Link
            href="/advisor/availability"
            className="mt-4 inline-flex rounded-md bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-ink-glow"
          >
            Set your availability
          </Link>
        )}
      </Card>
    </div>
  );
}
