import { PageHeader, Card } from "@/components/ui";
import { VerificationBadge } from "@/components/shared/VerificationBadge";

// Screen 11 — Verification status view. Plain-language status, never a raw
// internal enum shown to the advisor. This is an application-level state tied to
// AdvisorProfile.verificationStatus, not an auth permission.
export default function VerificationStatusPage() {
  // Sample — read the real status from the signed-in advisor's profile.
  const status = "PENDING" as const;

  const copy = {
    PENDING: "We're reviewing your application. This usually takes a few days — we'll email you the moment there's news. You don't need to do anything right now.",
    VERIFIED: "You're verified. Your profile is live and you can start taking bookings.",
    NEEDS_MORE_INFO: "We need a little more from you before we can verify you. Check your email for what's missing.",
    REJECTED: "We weren't able to verify your application this time. Your email has the details.",
  }[status];

  return (
    <div>
      <PageHeader title="Your verification" />
      <Card>
        <VerificationBadge status={status} />
        <p className="mt-4 text-body-lg text-gray-700">{copy}</p>
      </Card>
    </div>
  );
}
