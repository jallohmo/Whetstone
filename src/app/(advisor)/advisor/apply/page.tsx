import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, Card, Eyebrow } from "@/components/ui";
import { AuthForm } from "@/components/auth/AuthForm";
import { AdvisorRolePrompt } from "@/components/auth/AdvisorRolePrompt";
import { AdvisorOnboardingForm } from "@/components/advisor/AdvisorOnboardingForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Screen 10 — Advisor application/onboarding (A1, B1, B2).
// Public entry: prospective advisors create an ADVISOR account here, then complete
// the profile + specialties + credentials. Profile stays PENDING until ops verifies.
export const dynamic = "force-dynamic";

export default async function AdvisorApplyPage() {
  const user = await getCurrentUser();

  // Not signed in -> create an ADVISOR account first.
  if (!user) {
    return (
      <div>
        <PageHeader
          title="Become a Whetstone advisor"
          subtitle="Create your advisor account to start. It's a short application, and verification is what makes your profile trusted."
        />
        <Card>
          <AuthForm mode="signup" role="ADVISOR" next="/advisor/apply" />
        </Card>
        <p className="mt-6 text-sm text-gray-500">
          Already applied?{" "}
          <Link href="/login?next=/advisor/verification-status" className="font-semibold text-brand-blue hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  // Ops accounts don't belong in the advisor application.
  if (user.role === "OPS_ADMIN") redirect("/");

  // A CUSTOMER on the application — usually after signing in with Google, which
  // always creates a customer account. Offer a one-click switch to ADVISOR rather
  // than bouncing them home; the page then re-renders into the form below.
  if (user.role === "CUSTOMER") {
    return (
      <div>
        <PageHeader
          title="Become a Whetstone advisor"
          subtitle="You're signed in as a client. Continue as an advisor to complete the short application — verification is what makes your profile trusted."
        />
        <Card>
          <p className="mb-4 text-body text-gray-600">
            Signed in as <span className="font-semibold text-ink">{user.email}</span>.
            Switching to an advisor account lets you build a public profile and take
            bookings once you&apos;re verified.
          </p>
          <AdvisorRolePrompt />
        </Card>
        <p className="mt-6 text-sm text-gray-500">
          Didn&apos;t mean to?{" "}
          <Link href="/" className="font-semibold text-brand-blue hover:underline">
            Go back home
          </Link>
        </p>
      </div>
    );
  }

  // Already applied -> show status instead of re-collecting everything.
  const existing = await prisma.advisorProfile.findUnique({
    where: { userId: user.id },
    select: { verificationStatus: true },
  });
  if (existing && existing.verificationStatus !== "NEEDS_MORE_INFO") {
    redirect("/advisor/verification-status");
  }

  const industries = await prisma.industryTaxonomy.findMany({
    where: { parentId: null },
    orderBy: { name: "asc" },
    include: { children: { orderBy: { name: "asc" } } },
  });

  return (
    <div>
      <div className="mb-2">
        <Eyebrow tone="blue">Step 1 of 3 · Application</Eyebrow>
      </div>
      <PageHeader
        title={existing ? "Add the missing details" : "Complete your advisor profile"}
        subtitle="Worth doing properly — this is what clients and our verification team see."
      />
      <AdvisorOnboardingForm
        userId={user.id}
        industries={industries.map((i) => ({
          id: i.id,
          name: i.name,
          children: i.children.map((c) => ({ id: c.id, name: c.name })),
        }))}
      />
    </div>
  );
}
