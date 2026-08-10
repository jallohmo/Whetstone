import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ProfileCard } from "@/components/account/ProfileCard";
import { SectionNav, CUSTOMER_SECTIONS } from "@/components/account/SectionNav";
import { AccountSection } from "@/components/account/AccountSection";
import { PersonalInformation } from "@/components/account/PersonalInformation";
import { SecuritySettings } from "@/components/account/SecuritySettings";
import { NotificationSettings } from "@/components/account/NotificationSettings";
import { PaymentMethods } from "@/components/account/PaymentMethods";
import { DangerZone } from "@/components/account/DangerZone";
import { getCurrentUser } from "@/lib/auth";
import { getMfaStatus } from "@/lib/mfa";
import { prisma } from "@/lib/prisma";
import { keysForRole, resolvePrefs } from "@/lib/notifications";

// Screen 9c — Customer Account & profile.
export const dynamic = "force-dynamic";

export default async function CustomerAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (user.role === "ADVISOR") redirect("/advisor/account");
  if (user.role === "OPS_ADMIN") redirect("/ops");

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      email: true,
      fullName: true,
      phone: true,
      avatarUrl: true,
      notificationPrefs: true,
      createdAt: true,
      customerProfile: { select: { businessName: true } },
    },
  });
  if (!row) redirect("/login?next=/account");

  const prefs = resolvePrefs("CUSTOMER", row.notificationPrefs);
  const mfa = await getMfaStatus();
  const displayName = row.fullName ?? row.email.split("@")[0];

  return (
    <div className="mx-auto max-w-[1000px]">
      <PageHeader
        title="Account"
        subtitle="Manage your profile, security and how Whetstone reaches you."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left column */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-24">
          <ProfileCard
            userId={user.id}
            name={displayName}
            email={row.email}
            meta={`Customer since ${row.createdAt.getFullYear()}`}
            avatarUrl={row.avatarUrl}
          />
          <SectionNav items={CUSTOMER_SECTIONS} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <AccountSection id="personal" title="Personal information">
            <PersonalInformation
              fullName={row.fullName}
              email={row.email}
              phone={row.phone}
              businessName={row.customerProfile?.businessName ?? null}
            />
          </AccountSection>

          <AccountSection id="security" title="Security">
            <SecuritySettings twoFactorEnabled={mfa.enabled} twoFactorFactorId={mfa.factorId} />
          </AccountSection>

          <AccountSection id="notifications" title="Notifications">
            <NotificationSettings keys={keysForRole("CUSTOMER")} values={prefs} />
          </AccountSection>

          <AccountSection id="payments" title="Payment methods">
            <PaymentMethods />
          </AccountSection>

          <AccountSection id="danger" title="Delete account" tone="danger">
            <DangerZone role="customer" />
          </AccountSection>
        </div>
      </div>
    </div>
  );
}
