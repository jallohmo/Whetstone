import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

/**
 * Fixtures for the signed-in checkout check.
 *
 * Deliberately the smallest thing that can reach a checkout page: a client, an
 * advisor to name on it, and a booking sitting at pending_payment. The booking is
 * written straight to the database rather than driven through the matching and
 * booking screens — those screens are not what this spec is about, and every step
 * added between sign-in and the assertion is another thing that can break for a
 * reason unrelated to the bug being guarded against.
 *
 * It also creates its own taxonomy row and package instead of relying on
 * `npm run db:seed`, so the only setup a test database needs is the migrations.
 *
 * Auth users are minted with the service-role admin API (email pre-confirmed):
 * signing up through the UI sends a confirmation email and waits, which a test
 * cannot complete. The spec still signs in through the real login form.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

/** Whether this environment can run the signed-in spec at all. */
export const signedInCredentialsPresent = Boolean(
  SUPABASE_URL && SERVICE_ROLE_KEY && DATABASE_URL,
);

export const MISSING_CREDENTIALS_MESSAGE =
  "Signed-in checkout check skipped — needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DATABASE_URL pointing at a disposable test project.";

export interface CheckoutFixtures {
  client: { id: string; email: string; password: string };
  /** How the checkout page labels the advisor: the local part of their email. */
  advisorHandle: string;
  bookingId: string;
  scopeDescription: string;
}

function admin() {
  return createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createAccount(
  prisma: PrismaClient,
  email: string,
  role: "CUSTOMER" | "ADVISOR",
): Promise<{ id: string; email: string; password: string }> {
  // Random per run, so it can never collide with the breached-password corpus.
  const password = `Wh3tstone-e2e-${randomBytes(12).toString("hex")}!`;
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role },
  });
  if (error || !data?.user) {
    throw new Error(`Could not create the ${role} test user (${email}): ${error?.message}`);
  }
  // The auth trigger writes this row too, but from metadata and on its own
  // schedule; set it explicitly so the role is deterministic.
  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { role },
    create: { id: data.user.id, email, role },
  });
  return { id: data.user.id, email, password };
}

export async function seedCheckout(): Promise<{
  fixtures: CheckoutFixtures;
  teardown: () => Promise<void>;
}> {
  if (!signedInCredentialsPresent) throw new Error(MISSING_CREDENTIALS_MESSAGE);

  const prisma = new PrismaClient();
  const runId = randomBytes(4).toString("hex");
  const clientEmail = `e2e-client-${runId}@whetstone-e2e.test`;
  const advisorEmail = `e2e-advisor-${runId}@whetstone-e2e.test`;
  const scopeDescription = `One focused session (e2e ${runId})`;

  const industry = await prisma.industryTaxonomy.create({
    data: { name: `E2E Industry ${runId}`, slug: `e2e-industry-${runId}` },
    select: { id: true },
  });
  const pkg = await prisma.package.create({
    data: {
      name: `E2E package ${runId}`,
      sessionCount: 1,
      scopeDescription,
      priceCents: 12000,
      currency: "AUD",
    },
    select: { id: true, sessionCount: true, priceCents: true, currency: true },
  });

  const client = await createAccount(prisma, clientEmail, "CUSTOMER");
  const advisor = await createAccount(prisma, advisorEmail, "ADVISOR");

  const customerProfile = await prisma.customerProfile.create({
    data: { userId: client.id, businessName: `E2E Co ${runId}`, industryId: industry.id },
    select: { id: true },
  });
  const advisorProfile = await prisma.advisorProfile.create({
    data: {
      userId: advisor.id,
      bio: "Seeded fixture advisor.",
      headline: "Fixture advisor",
      yearsExperience: 10,
      verificationStatus: "VERIFIED",
    },
    select: { id: true },
  });

  // Straight to pending_payment — the state checkout exists to serve.
  const booking = await prisma.booking.create({
    data: {
      customerId: customerProfile.id,
      advisorId: advisorProfile.id,
      packageId: pkg.id,
      sessionCount: pkg.sessionCount,
      scopeDescription,
      priceCents: pkg.priceCents,
      currency: pkg.currency,
      status: "pending_payment",
      insuranceCoverageConfirmed: false,
    },
    select: { id: true },
  });

  const teardown = async () => {
    try {
      // Strictly id-scoped, in foreign-key order. Nothing matches on a pattern,
      // so a mistake here can only reach rows this run created.
      await prisma.payment.deleteMany({ where: { bookingId: booking.id } });
      await prisma.session.deleteMany({ where: { bookingId: booking.id } });
      await prisma.booking.delete({ where: { id: booking.id } });
      await prisma.customerProfile.delete({ where: { id: customerProfile.id } });
      await prisma.advisorProfile.delete({ where: { id: advisorProfile.id } });
      await prisma.package.delete({ where: { id: pkg.id } });
      await prisma.industryTaxonomy.delete({ where: { id: industry.id } });
      await prisma.user.deleteMany({ where: { id: { in: [client.id, advisor.id] } } });
      for (const id of [client.id, advisor.id]) {
        await admin().auth.admin.deleteUser(id);
      }
    } finally {
      await prisma.$disconnect();
    }
  };

  return {
    fixtures: {
      client,
      advisorHandle: advisorEmail.split("@")[0],
      bookingId: booking.id,
      scopeDescription,
    },
    teardown,
  };
}
