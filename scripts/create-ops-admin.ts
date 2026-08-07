/**
 * Create (or promote) an OPS_ADMIN — the invite-only, highest-privilege role.
 * There is NO public signup path for OPS_ADMIN by design; this server-side script
 * (service-role key) is the only way to grant it.
 *
 * It sets the role in BOTH places that matter:
 *   - auth user_metadata.role  -> read by middleware for route-group gating
 *   - public.users.role        -> authoritative source for getCurrentUser + RLS
 * (The handle_new_user trigger deliberately refuses to grant OPS from signup
 *  metadata, so the grant must happen here, out of band.)
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... DATABASE_URL=... \
 *     npx tsx scripts/create-ops-admin.ts ops@yourco.com 'a-strong-password'
 */
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("Usage: tsx scripts/create-ops-admin.ts <email> <password>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const prisma = new PrismaClient();

async function main() {
  // Create the auth user (email pre-confirmed) with OPS role in metadata.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "OPS_ADMIN" },
  });

  let userId = data?.user?.id;

  // If they already exist, find them and force the role metadata.
  if (error) {
    if (!/already registered|already exists/i.test(error.message)) throw error;
    const { data: list } = await admin.auth.admin.listUsers();
    const found = list.users.find((u) => u.email?.toLowerCase() === email!.toLowerCase());
    if (!found) throw new Error(`User ${email} exists but could not be located.`);
    userId = found.id;
    await admin.auth.admin.updateUserById(userId, { user_metadata: { role: "OPS_ADMIN" } });
  }

  if (!userId) throw new Error("Could not resolve the ops user id.");

  // Authoritative grant in public.users (service role / this connection bypasses RLS).
  await prisma.user.upsert({
    where: { id: userId },
    update: { role: "OPS_ADMIN" },
    create: { id: userId, email: email!, role: "OPS_ADMIN" },
  });

  console.log(`OPS_ADMIN ready: ${email} (${userId})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
