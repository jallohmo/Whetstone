import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ProfileCard } from "@/components/account/ProfileCard";
import { SectionNav, ADVISOR_SECTIONS } from "@/components/account/SectionNav";
import { AccountSection } from "@/components/account/AccountSection";
import { PublicProfileForm } from "@/components/account/PublicProfileForm";
import { SecuritySettings } from "@/components/account/SecuritySettings";
import { PayoutSettings } from "@/components/account/PayoutSettings";
import { NotificationSettings } from "@/components/account/NotificationSettings";
import { AdvisorDangerZone } from "@/components/account/AdvisorDangerZone";
import { getCurrentUser } from "@/lib/auth";
import { getMfaStatus } from "@/lib/mfa";
import { prisma } from "@/lib/prisma";
import { keysForRole, resolvePrefs } from "@/lib/notifications";
import { formatMoney } from "@/lib/currency";
import { stripeEnabled } from "@/lib/stripe";

// Screen 14c — Advisor Account & profile.
export const dynamic = "force-dynamic";

export default async function AdvisorAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advisor/account");
  if (user.role !== "ADVISOR") redirect("/");

  const [profile, row, roots, cheapest] = await Promise.all([
    prisma.advisorProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        headline: true,
        bio: true,
        yearsExperience: true,
        avatarUrl: true,
        verificationStatus: true,
        weeklyPayouts: true,
        deactivatedAt: true,
        stripeAccountId: true,
        specialtyTags: { select: { id: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, notificationPrefs: true },
    }),
    prisma.industryTaxonomy.findMany({
      where: { parentId: null },
      orderBy: { name: "asc" },
      include: { children: { orderBy: { name: "asc" } } },
    }),
    prisma.package.findFirst({ where: { active: true }, orderBy: { priceCents: "asc" } }),
  ]);

  if (!profile) redirect("/advisor/apply");

  const handle = row?.email?.split("@")[0] ?? "advisor";
  const verified = profile.verificationStatus === "VERIFIED";
  const prefs = resolvePrefs("ADVISOR", row?.notificationPrefs);
  const mfa = await getMfaStatus();
  const sessionRateLabel = cheapest
    ? `${formatMoney(cheapest.priceCents, cheapest.currency)} per single session`
    : null;

  return (
    <div>
      <PageHeader title="Account" subtitle="Your public advisor profile, security and payouts." />

      {profile.deactivatedAt && (
        <div className="mb-page-gap rounded-lg border border-amber-500/40 bg-amber-100 p-4 text-sm text-amber-700">
          Your profile is deactivated — customers can&apos;t see or book you. Reactivate
          it in the section below.
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-8">
          <ProfileCard
            userId={user.id}
            name={handle}
            email={row?.email ?? ""}
            meta={profile.headline ?? `${profile.yearsExperience} years' experience`}
            avatarUrl={profile.avatarUrl}
            verified={verified}
            publicProfileHref={verified ? `/advisors/${profile.id}` : null}
          />
          <SectionNav items={ADVISOR_SECTIONS} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <AccountSection id="profile" title="Public profile">
            <PublicProfileForm
              headline={profile.headline}
              bio={profile.bio}
              yearsExperience={profile.yearsExperience}
              industries={roots.map((r) => ({
                id: r.id,
                name: r.name,
                children: r.children.map((c) => ({ id: c.id, name: c.name })),
              }))}
              selectedIds={profile.specialtyTags.map((t) => t.id)}
              sessionRateLabel={sessionRateLabel}
            />
          </AccountSection>

          <AccountSection id="security" title="Security">
            <SecuritySettings twoFactorEnabled={mfa.enabled} twoFactorFactorId={mfa.factorId} />
          </AccountSection>

          <AccountSection id="payouts" title="Payout details">
            <PayoutSettings
              connected={Boolean(profile.stripeAccountId)}
              weeklyPayouts={profile.weeklyPayouts}
              stripeEnabled={stripeEnabled}
            />
          </AccountSection>

          <AccountSection id="notifications" title="Notifications">
            <NotificationSettings keys={keysForRole("ADVISOR")} values={prefs} />
          </AccountSection>

          <AccountSection id="danger" title="Leave the platform" tone="danger">
            <AdvisorDangerZone deactivated={Boolean(profile.deactivatedAt)} />
          </AccountSection>
        </div>
      </div>
    </div>
  );
}
