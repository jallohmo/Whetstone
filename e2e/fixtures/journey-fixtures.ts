import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

/**
 * Seeded fixtures for the authenticated end-to-end journey.
 *
 * The funnel suite (funnel.spec.ts) deliberately runs with no credentials and
 * covers only the logged-out path. This is the other half: a real session, a real
 * database, and a journey that ends with money held. Getting there needs three
 * things the anonymous suite doesn't:
 *
 *   1. Auth users that actually exist in Supabase. Signing up through the UI is
 *      not usable here — it sends a confirmation email and waits. Instead we mint
 *      users with the service-role admin API and `email_confirm: true` (exactly
 *      what scripts/create-ops-admin.ts does), then let the tests sign in through
 *      the real login form, so the auth path under test is the genuine one.
 *   2. A verified advisor with an open slot, because the matching workbench only
 *      lists VERIFIED advisors and the booking form disables submit without a slot.
 *   3. The taxonomy and packages from `npm run db:seed`. We assert their presence
 *      rather than creating them, so a misconfigured run fails with a sentence
 *      that names the fix instead of a confusing empty <select>.
 *
 * Everything created here is namespaced by a per-run id and torn down afterwards
 * by the ids captured at creation — never by pattern-matching live data.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Whether this environment can run the journey at all. The suite skips (rather
 * than fails) when false: a fork or a contributor without the test project's
 * secrets should still get a green run from the rest of the suite.
 */
export const journeyCredentialsPresent = Boolean(
  SUPABASE_URL && SERVICE_ROLE_KEY && DATABASE_URL,
);

export const MISSING_CREDENTIALS_MESSAGE =
  "Authenticated journey skipped — needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL pointing at a disposable test project.";

export interface JourneyAccount {
  id: string;
  email: string;
  password: string;
}

export interface JourneyFixtures {
  runId: string;
  client: JourneyAccount;
  ops: JourneyAccount;
  advisor: JourneyAccount & {
    profileId: string;
    /** How the UI labels this advisor — it renders the local part of the email. */
    handle: string;
  };
  industry: { id: string; name: string };
}

/** Strong and unique per run, so it can never collide with the breach corpus. */
function throwawayPassword(): string {
  return `Wh3tstone-e2e-${randomBytes(12).toString("hex")}!`;
}

function admin() {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Create a confirmed auth user and mirror it into public.users with the role we
 * need. The auth trigger (migration 0001) writes that row too, but it reads the
 * role from user metadata and we want this to be deterministic rather than
 * dependent on trigger timing — hence the explicit upsert, as in create-ops-admin.
 */
async function createAccount(
  prisma: PrismaClient,
  email: string,
  role: "CUSTOMER" | "ADVISOR" | "OPS_ADMIN",
): Promise<JourneyAccount> {
  const password = throwawayPassword();
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error || !data?.user) {
    throw new Error(`Could not create the ${role} test user (${email}): ${error?.message}`);
  }

  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { role },
    create: { id: data.user.id, email, role },
  });

  return { id: data.user.id, email, password };
}

/**
 * Provision one run's worth of fixtures. Returns everything the spec needs to
 * drive the UI; the caller is responsible for calling teardown.
 */
export async function seedJourney(): Promise<{
  fixtures: JourneyFixtures;
  teardown: () => Promise<void>;
}> {
  if (!journeyCredentialsPresent) throw new Error(MISSING_CREDENTIALS_MESSAGE);

  const prisma = new PrismaClient();
  const runId = randomBytes(4).toString("hex");

  // Reference data comes from `npm run db:seed`. Missing it is a setup mistake,
  // not a test failure, so say so plainly.
  const industry = await prisma.industryTaxonomy.findFirst({
    where: { parentId: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const pkg = await prisma.package.findFirst({ where: { active: true } });
  if (!industry || !pkg) {
    await prisma.$disconnect();
    throw new Error(
      "The industry taxonomy and packages are missing from the test database. Run `npm run db:seed` against it before the E2E suite.",
    );
  }

  const clientEmail = `e2e-client-${runId}@whetstone-e2e.test`;
  const opsEmail = `e2e-ops-${runId}@whetstone-e2e.test`;
  const advisorEmail = `e2e-advisor-${runId}@whetstone-e2e.test`;

  const client = await createAccount(prisma, clientEmail, "CUSTOMER");
  const ops = await createAccount(prisma, opsEmail, "OPS_ADMIN");
  const advisorAccount = await createAccount(prisma, advisorEmail, "ADVISOR");

  // VERIFIED, tagged with the industry the client will pick (so the workbench
  // surfaces them as a relevant candidate rather than a fallback), and holding one
  // future slot — the booking form disables its submit button without one.
  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const advisorProfile = await prisma.advisorProfile.create({
    data: {
      userId: advisorAccount.id,
      bio: "Seeded end-to-end fixture advisor.",
      headline: "Fixture advisor for the automated journey",
      yearsExperience: 12,
      verificationStatus: "VERIFIED",
      identityCheckPassed: true,
      insuranceCoverageActive: true,
      specialtyTags: { connect: { id: industry.id } },
      availabilitySlots: {
        create: {
          startsAt,
          endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
        },
      },
    },
    select: { id: true },
  });

  const fixtures: JourneyFixtures = {
    runId,
    client,
    ops,
    advisor: {
      ...advisorAccount,
      profileId: advisorProfile.id,
      handle: advisorEmail.split("@")[0],
    },
    industry,
  };

  const teardown = async () => {
    const userIds = [client.id, ops.id, advisorAccount.id];
    try {
      // Strictly id-scoped and in foreign-key order. Nothing here matches on a
      // pattern, so a bug in this function can only ever touch rows this run made.
      const customer = await prisma.customerProfile.findUnique({
        where: { userId: client.id },
        select: { id: true },
      });
      const bookingIds = (
        await prisma.booking.findMany({
          where: { advisorId: advisorProfile.id },
          select: { id: true },
        })
      ).map((b) => b.id);

      if (bookingIds.length > 0) {
        const where = { bookingId: { in: bookingIds } };
        // Every child of Booking, so extending the journey later (a review, a
        // dispute) doesn't turn teardown into a foreign-key error.
        await prisma.payment.deleteMany({ where });
        await prisma.session.deleteMany({ where });
        await prisma.message.deleteMany({ where });
        await prisma.review.deleteMany({ where });
        await prisma.outcomeSurvey.deleteMany({ where });
        await prisma.dispute.deleteMany({ where });
        await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      }
      if (customer) {
        const needIds = (
          await prisma.need.findMany({ where: { customerId: customer.id }, select: { id: true } })
        ).map((n) => n.id);
        if (needIds.length > 0) {
          await prisma.matchDecision.deleteMany({ where: { needId: { in: needIds } } });
          await prisma.need.deleteMany({ where: { id: { in: needIds } } });
        }
        await prisma.customerProfile.delete({ where: { id: customer.id } });
      }
      await prisma.availabilitySlot.deleteMany({ where: { advisorId: advisorProfile.id } });
      await prisma.verificationRecord.deleteMany({ where: { advisorId: advisorProfile.id } });
      await prisma.advisorProfile.delete({ where: { id: advisorProfile.id } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });

      for (const id of userIds) {
        await admin().auth.admin.deleteUser(id);
      }
    } finally {
      await prisma.$disconnect();
    }
  };

  return { fixtures, teardown };
}
